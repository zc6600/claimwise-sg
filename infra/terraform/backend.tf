# State lives in a private, versioned bucket so every operator and CI job shares it.
terraform {
  backend "gcs" {
    bucket = "claimwise-sg-tfstate"
    prefix = "terraform/state"
  }
}
