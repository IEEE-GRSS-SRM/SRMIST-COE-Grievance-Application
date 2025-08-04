# run in a pytorch cuda environment
# conda create -n pytorchgpu python=3.10
# conda activate pytorchgpu
# conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia
# pip install sentence-transformers==5.0.0 numpy==2.0.1
# pip install fastapi uvicorn

from sentence_transformers import SentenceTransformer
from sentence_transformers import CrossEncoder
import sentence_transformers as st
import numpy as np
from typing import List
import os
import json
import torch
import torchvision
import torchaudio
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

def normalize_cosine_similarity(cos_sim):
    return 0.5 * cos_sim + 0.5

def find_point_of_inflection(data):
    data.sort(reverse=True)
    data = np.array(data)
    first_derivative = np.diff(data)
    second_derivative = np.diff(first_derivative)

    # inflection = where second derivative changes sign from negative to positive
    for i in range(1, len(second_derivative)):
        if second_derivative[i - 1] < 0 and second_derivative[i] > 0:
            return (i + 1, data[i + 1])  # +1 to offset diff offset

    return None

def find_point_of_knee(data):
    from kneed import KneeLocator
    x = list(range(len(data)))
    kl = KneeLocator(x, data, curve='convex', direction='decreasing')
    return kl.knee, data[kl.knee]

def get_threshold(data):
    inflection_poinf_idx, inflection_point = find_point_of_inflection(data)
    knee_idx, knee = find_point_of_knee(data)
    if knee_idx < inflection_poinf_idx:
        return knee_idx, knee
    return inflection_poinf_idx, inflection_point

class VectorDB:
    def __init__(self, path=""):
        self.transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.path = path
        self.similarity_checking_model = CrossEncoder('cross-encoder/stsb-roberta-base')
        os.makedirs(self.path, exist_ok=True)
        
        self.meta_path = os.path.join(self.path, "meta.txt")
        self.clear()

    def add_vector(self, text: str):
        text = text.strip()
    
        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() == text:
                    return

        with open(self.meta_path, "a", encoding="utf-8") as f_meta:
            f_meta.write(text + "\n")

    def get_most_similar(self, text):
        most_similar_text = None
        max_similarity = float('-inf')
    
        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                candidate = line.strip()
                if not candidate:
                    continue
                score = self.similarity_checking_model.predict([(text, candidate)])[0]
                if score > max_similarity:
                    max_similarity = score
                    most_similar_text = candidate
    
        if most_similar_text is not None:
            return most_similar_text, max_similarity
        return None

    def get_most_similar_with_hybrid_score(self, text):
        most_similar_text = None
        max_similarity = float('-inf')

        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                candidate = line.strip()
                if not candidate:
                    continue
                semantic_similarity = self.similarity_checking_model.predict([(text, candidate)])[0]
                cos_sim = cosine_similarity([self.transformer_model.encode(text)], [self.transformer_model.encode(candidate)])[0][0]
                normalized_cos_sim = normalize_cosine_similarity(cos_sim)
                score = semantic_similarity * normalized_cos_sim
                if score > max_similarity:
                    max_similarity = score
                    most_similar_text = candidate

        if most_similar_text is not None:
            return most_similar_text, max_similarity
        return None
    
    def get_all_scores(self, text):
        scores = []
        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                candidate = line.strip()
                if not candidate:
                    continue
                semantic_similarity = self.similarity_checking_model.predict([(text, candidate)])[0]
                cos_sim = cosine_similarity([self.transformer_model.encode(text)], [self.transformer_model.encode(candidate)])[0][0]
                normalized_cos_sim = normalize_cosine_similarity(cos_sim)
                score = semantic_similarity * normalized_cos_sim
                scores.append(score)
        scores.sort(reverse=True)
        return scores

    def get_all_sentence_greater_than_threshold(self, text, threshold):
        questions = []
        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                candidate = line.strip()
                if not candidate:
                    continue
                semantic_similarity = self.similarity_checking_model.predict([(text, candidate)])[0]
                cos_sim = cosine_similarity([self.transformer_model.encode(text)], [self.transformer_model.encode(candidate)])[0][0]
                normalized_cos_sim = normalize_cosine_similarity(cos_sim)
                score = semantic_similarity * normalized_cos_sim
                if score > threshold and score > 0.25: # 0.25 is E[cosine_similarity, semantic_similarity]
                    questions.append(candidate)

        return questions

    def clear(self):
        if os.path.exists(self.meta_path):
            os.remove(self.meta_path)
        open(self.meta_path, "a").close()

class AgiDataset:
    def __init__(self, path: str):
        if os.path.exists(path):
            self.path = path
        else:
            raise Exception("That path doesn't exist!")
        if not path.endswith(".jsonl"):
            raise Exception("AgiDataset class instantiation needs a path to a .jsonl file.")
            
    def get_answer_for(self, question):
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                if obj["user"] == question:
                    return obj["assistant"]
        return None
    
    def add_questions_to_vector_db(self, vector_db: VectorDB):
        with open(self.path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                vector_db.add_vector(obj["user"])

vector_db = VectorDB(path="VectorDB")
dataset = AgiDataset(path="data/data.jsonl")
dataset.add_questions_to_vector_db(vector_db)

def get_answer_for(request, vector_db, dataset):
    most_similar_string, similarity = vector_db.get_most_similar(request)
    if similarity < 0.5:
        return "I can't answer that.", similarity
    return dataset.get_answer_for(most_similar_string), similarity


app = FastAPI()

class Query(BaseModel):
    question: str

@app.post("/ask")
def ask(query: Query):
    scores = vector_db.get_all_scores(query.question)
    idx, threshold = get_threshold(scores)
    questions = vector_db.get_all_sentence_greater_than_threshold(query.question, threshold)

    if not questions:
        return {
            "answer": "I can't answer that.",
        }

    result_string = ""
    for question in questions:
        result_string = result_string + "Q: " + question + "\n"
        result_string = result_string + "A: " + dataset.get_answer_for(question) + "\n\n"

    return {
        "answer": result_string,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("deploy:app", host="127.0.0.1", port=8000, reload=True)