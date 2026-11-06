output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "web_app_id" {
  description = "Firebase Web Application ID"
  value       = google_firebase_web_app.web_client.app_id
}

output "firestore_database" {
  description = "Firestore Native Database Name"
  value       = google_firestore_database.default.name
}

output "cloud_run_url" {
  description = "Public HTTPS URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.claimwise_app.uri
}

output "authorized_domains" {
  description = "Configured authorized OAuth domains"
  value       = var.authorized_domains
}

output "firestore_ruleset" {
  description = "Deployed Firestore Ruleset Name"
  value       = google_firebaserules_ruleset.firestore.name
}
