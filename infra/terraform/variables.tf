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

variable "resend_api_key" {
  description = "Resend API key for reminder emails; reminders stay disabled when empty"
  type        = string
  sensitive   = true
  default     = ""
}

variable "reminder_from_email" {
  description = "Verified sender address for reminder emails"
  type        = string
  default     = "ClaimWise SG <reminders@zc6600.wiki>"
}

variable "reminder_site_url" {
  description = "Public site URL used in reminder email links; it must serve the API routes"
  type        = string
  default     = "https://claimwise-sg-721110976915.asia-southeast1.run.app"
}

variable "reminder_token_secret" {
  description = "Secret of at least 32 characters for signing reminder links"
  type        = string
  sensitive   = true
  default     = ""
}

variable "reminder_dispatch_secret" {
  description = "Bearer secret for the daily reminder dispatch; the job is created only when set"
  type        = string
  sensitive   = true
  default     = ""
}
