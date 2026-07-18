import os
from pathlib import Path
from dotenv import load_dotenv
from corsheaders.defaults import default_headers, default_methods

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent


# ========================
# SECURITY SETTINGS
# ========================

SECRET_KEY = os.environ.get("SECRET_KEY")

DEBUG = os.environ.get("DEBUG", "False") == "True"

ALLOWED_HOSTS = ["*"]


# ========================
# APPLICATIONS
# ========================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',
    "cloudinary",
    "cloudinary_storage",

    # Local apps
    'accounts.apps.AccountsConfig',
    'projects',
    'clients',
    'sgm',
    'employees',
    'tasks',
    'ddtme',
    'mctc',
    'meeting_agenda',
    'ddfms',
    'achievement',
    'rc7',
    'notifications.apps.NotificationsConfig',
    
]

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
    'API_KEY': os.environ.get('CLOUDINARY_API_KEY', ''),
    'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET', ''),
}
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
# ========================
# MIDDLEWARE
# ========================

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ========================
# CSRF
# ========================

CSRF_TRUSTED_ORIGINS = [
    "https://project-management-l8mp.onrender.com",
]

# ========================
# CORS
# ========================

CORS_ALLOWED_ORIGINS = [
    "https://project-management-l8mp.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://project-management-[a-z0-9-]+\.onrender\.com$",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers)

CORS_ALLOW_METHODS = list(default_methods)
# CSRF_TRUSTED_ORIGINS = [
#     "https://projectmanagement-1-3vmg.onrender.com",
#     "https://projectmanagement-2-pync.onrender.com",
# ]
# ========================
# CORS
# ========================

# ========================
# CORS
# ========================

# CORS_ALLOWED_ORIGINS = [
#     "http://localhost:5173",  # Local Vite frontend
#     "https://projectmanagement-2-pync.onrender.com",  # Add after frontend deploy
# ]
# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local development
    "http://localhost:5174",  # Local development
    "http://localhost:5175",  # Local development
    "http://localhost:3000",  # Alternative local
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://projectmanagement-1-3vmg.onrender.com",
    "https://projectmanagement-2-pync.onrender.com",
]

# CORS_ALLOWED_ORIGIN_REGEXES = [
#     r"^https://projectmanagement-[a-z0-9-]+\.onrender\.com$",
# ]

# Temporary safety net for production CORS incidents between Render apps.
# Keep explicit allowlists above for long-term control.
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers)

CORS_ALLOW_METHODS = list(default_methods)
# ========================
# URLS & TEMPLATES
# ========================

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR.parent / "client/dist"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# ========================
# DATABASE (SQLite for local development)
# ========================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ========================
# PASSWORD VALIDATION
# ========================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ========================
# INTERNATIONALIZATION
# ========================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# ========================
# STATIC FILES
# ========================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = [
    BASE_DIR.parent / "client/dist/assets",
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# ========================
# MEDIA
# ========================

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ========================
# AUTH
# ========================

AUTH_USER_MODEL = 'accounts.CustomUser'


# ========================
# REST FRAMEWORK
# ========================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=15),
}
