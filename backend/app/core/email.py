from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.config import settings

# fastapi-mail için bağlantı ayarları
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

async def send_invitation_email(email_to: EmailStr, name: str, temporary_password: str):
    """
    Kullanıcıya geçici şifresini içeren bir davet e-postası gönderir.
    """
    
    # E-posta içeriği (HTML formatında)
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #0056b3;">Kocaer DPP Portal'a Davet Edildiniz</h2>
        <p>Merhaba <strong>{name}</strong>,</p>
        <p>Dijital Ürün Pasaportu (DPP) platformunda sizin için bir hesap oluşturuldu. Sisteme giriş yapmak için aşağıdaki bilgileri kullanabilirsiniz:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>E-posta (Kullanıcı Adı):</strong> {email_to}</p>
            <p style="margin: 10px 0 0 0;"><strong>Geçici Şifre:</strong> <span style="font-size: 18px; font-weight: bold; color: #d9534f;">{temporary_password}</span></p>
        </div>
        
        <p style="color: #d9534f; font-weight: bold; margin-top: 15px;">⚠️ Dikkat: Bu şifre tamamen geçicidir!</p>
        <p>Sisteme ilk girişinizi bu geçici şifreyle yaptıktan sonra, kendi hesabınızdan kalıcı şifrenizi belirlemeniz/değiştirmeniz gerekmektedir.</p>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="{settings.FRONTEND_URL}/login" style="background-color: #0056b3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sisteme Giriş Yap</a>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #888;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen cevaplamayınız.</p>
    </div>
    """

    message = MessageSchema(
        subject="Kocaer DPP Portal Daveti",
        recipients=[email_to],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    
    try:
        await fm.send_message(message)
        print(f"Başarılı: {email_to} adresine e-posta gönderildi.")
        return True
    except Exception as e:
        print(f"E-posta gönderme hatası: {str(e)}")
        # Log mekanizmasına yazılabilir
        return False
