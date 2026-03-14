import os
import django
from django.core.files.uploadedfile import SimpleUploadedFile

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import CustomUser

def test_upload():
    print("Testing upload...")
    # Create or get a user
    user, created = CustomUser.objects.get_or_create(username="test_cloudinary", email="test_cloud@example.com")
    
    # Create a dummy image file
    image_content = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    photo = SimpleUploadedFile("test_image.gif", image_content, content_type="image/gif")
    
    user.photo.save("test_image.gif", photo)
    user.save()
    
    print("User photo URL:", user.photo.url)
    print("Success!")

if __name__ == "__main__":
    test_upload()
