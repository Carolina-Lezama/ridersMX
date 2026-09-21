# geminiapi.py
from flask import Flask, request, jsonify
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
# print("Tus modelos disponibles son:")
# print("-" * 30)

# # Le pedimos a Google la lista de modelos permitidos
# for modelo in client.models.list():
#     # Filtramos para que solo muestre los que pueden generar contenido
#     if "generateContent" in modelo.supported_actions:
#         print(modelo.name)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response

@app.route('/api/chat', methods=['POST',])
def chat():
    data = request.json
    mensaje = data.get('mensaje', '')

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=mensaje
        )
        return jsonify({"respuesta": response.text})
    except Exception as e:
        # En vez de dejar que la app explote, le mandamos este mensaje al usuario:
        mensaje_error = "Lo siento, mis servidores están un poco saturados en este momento. ¡Intenta en unos minutos!"
        return jsonify({"respuesta": mensaje_error}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

