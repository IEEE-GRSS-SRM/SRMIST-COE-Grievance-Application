# run in a pytorch cuda environment
# conda create -n pytorchgpu python=3.10
# conda activate pytorchgpu
# conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia
# pip install sentence-transformers==5.0.0 numpy==2.0.1
# pip install fastapi uvicorn

from sentence_transformers import SentenceTransformer
from sentence_transformers import CrossEncoder
import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

class VectorDB:
    def __init__(self, path=""):
        self.transformer_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.path = path
        self.similarity_checking_model = CrossEncoder('cross-encoder/stsb-roberta-base')
        os.makedirs(self.path, exist_ok=True)
        
        self.meta_path = os.path.join(self.path, "meta.txt")
        self.vector_path = os.path.join(self.path, "vectors.txt")
        self.clear()

    def add_vector(self, text: str):
        text = text.strip()
    
        with open(self.meta_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() == text:
                    return
    
        text_vector = self.transformer_model.encode(text)

        with open(self.meta_path, "a", encoding="utf-8") as f_meta:
            f_meta.write(text + "\n")
    
        with open(self.vector_path, "a", encoding="utf-8") as f_vec:
            f_vec.write(' '.join(map(str, text_vector)) + "\n")

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

    def clear(self):
        if os.path.exists(self.meta_path):
            os.remove(self.meta_path)
        if os.path.exists(self.vector_path):
            os.remove(self.vector_path)
        open(self.meta_path, "a").close()
        open(self.vector_path, "a").close()

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
    answer, similarity = get_answer_for(query.question, vector_db, dataset)
    if answer is None:
        raise HTTPException(status_code=404, detail="No answer found.")
    return {
        "answer": answer,
        "similarity": float(similarity)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("deploy:app", host="127.0.0.1", port=8000, reload=True)