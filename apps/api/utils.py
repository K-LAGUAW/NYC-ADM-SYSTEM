import requests

def send_whatsapp_message(message_content, phone_number):
    url = "https://7105.api.greenapi.com/waInstance7105242810/sendMessage/6898348cf8b44682a7799a11239a9befaa04faf205b54e2f90"

    payload = {
        "chatId": f"549{phone_number}@c.us",
        "message": message_content,
        "customPreview": {}
    }
    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=payload, headers=headers)

    return response.text.encode('utf8'), response.status_code