package main

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

// loadDotEnv reads a .env file from the repo root and sets env vars for any
// keys not already present in the environment. Existing env vars win, so real
// shells / CI / docker can always override.
func loadDotEnv() {
	root := projectRoot()
	path := filepath.Join(root, ".env")
	file, err := os.Open(path)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "export ") {
			line = strings.TrimPrefix(line, "export ")
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		value = stripQuotes(value)
		if key == "" {
			continue
		}
		if _, present := os.LookupEnv(key); !present {
			_ = os.Setenv(key, value)
		}
	}
}

func stripQuotes(s string) string {
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			return s[1 : len(s)-1]
		}
	}
	return s
}
