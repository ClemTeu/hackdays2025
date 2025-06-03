import ast
import json
import os
import re

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from langchain_core.prompts import PromptTemplate
from openai import OpenAI
from pydantic import BaseModel

from .prompt_template import complete_template, format_attendu, prompt_generic2

load_dotenv()

client = OpenAI(
    base_url="https://albert.api.etalab.gouv.fr/v1",
    api_key=os.getenv("API_KEY"),
)

app = FastAPI()


class LLMRequest(BaseModel):
    prompt: str


class GenerateJSONRequest(BaseModel):
    client_request: str


@app.post("/llm/query", tags=["LLM"])
async def query_llm(request: LLMRequest):
    try:
        response = client.chat.completions.create(
            model="albert-large",
            messages=[{"role": "user", "content": request.prompt}],
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-json-text", tags=["LLM"])
async def generate_json_text(
    client_request: str = Query(
        ..., description="Requête utilisateur pour la génération de slides"
    )
):
    try:
        prompt_template = PromptTemplate.from_template(prompt_generic2)
        final_prompt = prompt_template.format(
            format_attendu=format_attendu,
            client_request=client_request,
        )
        print("[LOG] Prompt envoyé au LLM:\n", final_prompt)
        response = client.chat.completions.create(
            model="albert-small",
            messages=[{"role": "user", "content": final_prompt}],
        )
        content = response.choices[0].message.content
        try:
            extract_json = re.search(r"{.*}", content, re.DOTALL)
            final_output = extract_json.group(0)
            try:
                json_obj = json.loads(final_output)
            except json.JSONDecodeError:
                json_obj = ast.literal_eval(final_output)
            rendered = complete_template.substitute(json_obj)
            parsed_json = json.loads(rendered)
            return parsed_json
        except Exception as e:
            print(f"[LOG] Erreur lors du traitement : {e}")
            print("[LOG] Contenu brut :", content)
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors du traitement : {e}\nContenu brut : {content}",
            )
    except Exception as e:
        print("[LOG] Erreur lors de la génération:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Documentation Swagger
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "Accédez à /docs pour la documentation Swagger"}
