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

resource "google_project_service" "firebaserules" {
  project            = var.project_id
  service            = "firebaserules.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_scheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
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

# 3b. Declarative Firestore Security Rules Deployment
resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file("${path.module}/../../firestore.rules")
    }
  }

  depends_on = [
    google_project_service.firebaserules,
    google_firestore_database.default
  ]
}

resource "google_firebaserules_release" "firestore" {
  name         = "cloud.firestore"
  project      = var.project_id
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
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

      env {
        name = "RESEND_API_KEY"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.resend_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "REMINDER_FROM_EMAIL"
        value = var.reminder_from_email
      }

      env {
        name  = "REMINDER_SITE_URL"
        value = var.reminder_site_url
      }

      env {
        name = "REMINDER_TOKEN_SECRET"
        value_source {
          secret_key_ref {
            secret  = data.google_secret_manager_secret.reminder_token_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "REMINDER_SCHEDULER_EMAIL"
        value = google_service_account.reminder_scheduler.email
      }
    }
  }

  depends_on = [
    google_project_service.cloud_run,
    google_firestore_database.default,
    google_secret_manager_secret_iam_member.cloud_run_resend_api_key,
    google_secret_manager_secret_iam_member.cloud_run_reminder_token_secret
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

# 9. Firestore Access for Server-Managed Reminder Subscriptions
data "google_project" "current" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloud_run_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# 10. Reminder Secrets
# Secret values are added outside Terraform so they never enter state or tfvars.
data "google_secret_manager_secret" "resend_api_key" {
  project   = var.project_id
  secret_id = "RESEND_API_KEY"

  depends_on = [google_project_service.secret_manager]
}

data "google_secret_manager_secret" "reminder_token_secret" {
  project   = var.project_id
  secret_id = "REMINDER_TOKEN_SECRET"

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_iam_member" "cloud_run_resend_api_key" {
  project   = var.project_id
  secret_id = data.google_secret_manager_secret.resend_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_iam_member" "cloud_run_reminder_token_secret" {
  project   = var.project_id
  secret_id = data.google_secret_manager_secret.reminder_token_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# 11. Daily Reminder Dispatch at 09:00 Singapore Time
resource "google_service_account" "reminder_scheduler" {
  project      = var.project_id
  account_id   = "reminder-scheduler"
  display_name = "ClaimWise reminder scheduler"
}

resource "google_cloud_scheduler_job" "reminder_dispatch" {
  name      = "${var.service_name}-reminder-dispatch"
  project   = var.project_id
  region    = var.region
  schedule  = "0 9 * * *"
  time_zone = "Asia/Singapore"

  http_target {
    http_method = "POST"
    uri         = "${var.reminder_site_url}/api/reminders/dispatch"

    oidc_token {
      service_account_email = google_service_account.reminder_scheduler.email
      audience              = "${var.reminder_site_url}/api/reminders/dispatch"
    }
  }

  depends_on = [google_project_service.cloud_scheduler]
}
