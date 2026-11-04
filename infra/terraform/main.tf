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
  project            = var.project_id
  service            = "identitytoolkit.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebase" {
  project            = var.project_id
  service            = "firebase.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# 2. Firestore Native Database in Singapore
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# 3. Link Google Cloud Project with Firebase
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.identity_toolkit,
    google_project_service.firebase
  ]
}

# 4. Global Identity Platform Configuration (Authorized Domains)
resource "google_identity_platform_config" "identity_config" {
  provider           = google-beta
  project            = var.project_id
  authorized_domains = var.authorized_domains

  depends_on = [google_project_service.identity_toolkit]
}

# 5. Configure Google Identity Platform (GCIP) Google OAuth Provider
resource "google_identity_platform_default_supported_idp_config" "google_signin" {
  provider      = google-beta
  project       = var.project_id
  enabled       = true
  idp_id        = "google.com"
  client_id     = var.google_client_id
  client_secret = var.google_client_secret

  depends_on = [google_identity_platform_config.identity_config]
}

# 6. Register Firebase Web Application
resource "google_firebase_web_app" "web_client" {
  provider     = google-beta
  project      = var.project_id
  display_name = "ClaimWiseWeb"

  depends_on = [google_firebase_project.default]
}

# 7. Serverless Cloud Run v2 Service (Singapore)
resource "google_cloud_run_v2_service" "claimwise_app" {
  name     = var.service_name
  location = var.region
  project  = var.project_id
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    containers {
      image = var.container_image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
      }

      env {
        name  = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
        value = "${var.project_id}.firebaseapp.com"
      }
    }
  }

  depends_on = [
    google_project_service.cloud_run,
    google_firestore_database.default
  ]
}

# 8. Allow Public Unauthenticated HTTPS Access to Cloud Run Service
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.claimwise_app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
