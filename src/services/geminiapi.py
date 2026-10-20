from flask import Flask, request, jsonify
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError(
        "Falta GEMINI_API_KEY. Agrégala al archivo .env antes de iniciar el chatbot."
    )
client = genai.Client(api_key=api_key)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/chat")
def chat():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "El cuerpo de la solicitud debe ser JSON."}), 400

    mensaje = data.get("mensaje")
    if not isinstance(mensaje, str) or not mensaje.strip():
        return jsonify({"error": "Escribe una consulta antes de enviarla."}), 400

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=mensaje.strip(),
        )
        if not response.text:
            app.logger.error("Gemini returned an empty response.")
            return jsonify({"error": "Gemini no devolvió una respuesta."}), 502
        return jsonify({"respuesta": response.text})
    except Exception:
        app.logger.exception("Error al generar una respuesta con Gemini.")
        return jsonify(
            {"error": "No se pudo obtener una respuesta de Gemini. Inténtalo de nuevo."}
        ), 502

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)