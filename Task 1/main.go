package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type RequestData struct {
	Message string `json:"message"`
}

type ResponseData struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetRequest(w)
			return
		}

		if r.Method == http.MethodPost {
			handlePostRequest(w, r)
			return
		}

		// For other HTTP methods
		w.WriteHeader(http.StatusMethodNotAllowed)
		jsonResponse(w, ResponseData{
			Status:  "fail",
			Message: "Invalid HTTP method",
		})
	})

	fmt.Println("Server is running on port 8080...")
	http.ListenAndServe(":8080", nil)
}

func handleGetRequest(w http.ResponseWriter) {
	htmlContent := `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>JSON Request Tester</title>
	</head>
	<body>
		<h1>JSON Request Tester</h1>
		<form id="postForm">
			<label for="message">Message:</label>
			<input type="text" id="message" name="message" required>
			<button type="button" onclick="sendPostRequest()">Send POST Request</button>
		</form>
		<div id="response"></div>
		<script>
			async function sendPostRequest() {
				const message = document.getElementById('message').value;
				const response = await fetch('/', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ message }),
				});
				const responseData = await response.json();
				document.getElementById('response').innerText = JSON.stringify(responseData, null, 2);
			}
		</script>
	</body>
	</html>
	`
	w.Header().Set("Content-Type", "text/html")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(htmlContent))
}

func handlePostRequest(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		jsonResponse(w, ResponseData{
			Status:  "fail",
			Message: "Invalid JSON format",
		})
		return
	}
	defer r.Body.Close()

	var requestData RequestData
	if err := json.Unmarshal(body, &requestData); err != nil || requestData.Message == "" {
		w.WriteHeader(http.StatusBadRequest)
		jsonResponse(w, ResponseData{
			Status:  "fail",
			Message: "Invalid JSON message",
		})
		return
	}

	fmt.Printf("Received message: %s\n", requestData.Message)
	w.WriteHeader(http.StatusOK)
	jsonResponse(w, ResponseData{
		Status:  "success",
		Message: "Data successfully received",
	})
}

func jsonResponse(w http.ResponseWriter, response ResponseData) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
