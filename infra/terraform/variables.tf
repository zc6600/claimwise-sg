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
  default     = "721110976915-2bgbn6qsiuip62opbva4kipisqn8138b.apps.googleusercontent.com"
}

variable "google_client_secret" {
  description = "OAuth 2.0 Client Secret, used only when the Google Sign-In provider is first created"
  type        = string
  sensitive   = true
  default     = ""
}

variable "authorized_domains" {
  description = "List of domains authorized for OAuth redirection"
  type        = list(string)
  default = [
    "localhost",
    "127.0.0.1",
    "claimwise-sg.firebaseapp.com",
    "claimwise-sg.web.app",
    "claimwise-sg-721110976915.asia-southeast1.run.app",
    "claimwise.zc6600.wiki"
  ]
}

variable "reminder_from_email" {
  description = "Verified sender address for reminder emails"
  type        = string
  default     = "ClaimWise SG <reminders@zc6600.wiki>"
}

variable "reminder_site_url" {
  description = "Public site URL used in reminder email links; it must serve the API routes"
  type        = string
  default     = "https://claimwise.zc6600.wiki"
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to deploy through Workload Identity Federation"
  type        = string
  default     = "zc6600/claimwise-sg"
}
