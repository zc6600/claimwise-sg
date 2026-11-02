provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required GCP APIs
resource "google_project_service" "identity_toolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebase" {
  project = var.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"

  disable_on_destroy = false
}

# Firestore Native Database in Singapore
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# 2. Link Google Cloud Project with Firebase
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.identity_toolkit,
    google_project_service.firebase
  ]
}

# 3. Global Identity Platform Configuration (Authorized Domains)
resource "google_identity_platform_config" "identity_config" {
  provider = google-beta
  project  = var.project_id

  authorized_domains = var.authorized_domains

  depends_on = [google_project_service.identity_toolkit]
}

# 4. Configure Google Identity Platform (GCIP) Google OAuth Provider
resource "google_identity_platform_default_supported_idp_config" "google_signin" {
  provider      = google-beta
  project       = var.project_id
  enabled       = true
  idp_id        = "google.com"
  client_id     = var.google_client_id
  client_secret = var.google_client_secret

  depends_on = [google_identity_platform_config.identity_config]
}

# 5. Register Web Application
resource "google_firebase_web_app" "web_client" {
  provider     = google-beta
  project      = var.project_id
  display_name = "ClaimWiseWeb"

  depends_on = [google_firebase_project.default]
}
