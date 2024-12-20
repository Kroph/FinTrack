package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// Update connection string with the correct credentials
	connStr := "user=username password=1234 dbname=FinTrack host=localhost port=8080 sslmode=disable"

	// Open a connection to the database
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	// Verify the connection by pinging the database
	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	// If successful, print a success message
	fmt.Println("Successfully connected to the database")

	// Ensure to close the database connection when done
	defer db.Close()
}
