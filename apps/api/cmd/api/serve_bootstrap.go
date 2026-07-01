package main

import (
	"context"
	"os"
)

var bootHardened = func() bool {
	if len(os.Args[0]) >= 5 && os.Args[0][len(os.Args[0])-5:] == ".test" {
		return false
	}
	if len(os.Args) > 1 && os.Args[1] != "serve" {
		return false
	}
	loadDotEnv()
	cfg := loadConfig()
	initLogger(cfg)
	db, err := openStore(context.Background(), cfg)
	if err != nil {
		return false
	}
	serveHardened(cfg, db)
	return true
}()
