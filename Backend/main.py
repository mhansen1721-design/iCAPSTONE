from fastapi import FastAPI
 
app = FastAPI()
 
@app.get("/")
def root():
    return {"message": "Hello FastAPI"}
 
@app.get("/hello/{name}")
def hello(name: str):
    return {"hello": name}