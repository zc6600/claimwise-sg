variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
  default     = "claimwise-sg"
}

variable "region" {
  description = "The GCP region for regional resources"
  type        = string
  default     = "asia-southeast1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "claimwise-sg"
}

variable "container_image" {
  description = "Container image URI deployed to Cloud Run"
  type        = string
  default     = "asia-southeast1-docker.pkg.dev/claimwise-sg/cloud-run-source-deploy/claimwise-sg:latest"
}

variable "google_client_id" {
  description = "OAuth 2.0 Client ID for Google Sign-In"
  type        = string
}

variable "google_client_secret" {
  description = "OAuth 2.0 Client Secret for Google Sign-In"
  type        = string
  sensitive   = true
}

variable "authorized_domains" {
  description = "List of domains authorized for OAuth redirection"
  type        = list(string)
  default = [
    "localhost",
    "127.0.0.1",
    "claimwise-sg.firebaseapp.com",
    "claimwise-sg.web.app",
    "claimwise-sg-721110976915.asia-southeast1.run.app"
  ]
}
