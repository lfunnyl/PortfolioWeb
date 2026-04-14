"""
E-posta doğrulama ve şifre sıfırlama için token üretimi ve e-posta gönderim servisi.
fastapi-mail ve JWT kullanır.
"""
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from core.config import settings

# ── JWT Tabanlı Token Üretimi ─────────────────────────────────────────────────
# Ayrı bir DB tablosu yerine kısa ömürlü JWT token'ları kullanıyoruz.
# Bu sayede token'lar otomatik süresi dolduğunda geçersiz hale gelir.

EMAIL_VERIFY_EXPIRE_HOURS = 24
PASSWORD_RESET_EXPIRE_HOURS = 1


def create_email_verification_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=EMAIL_VERIFY_EXPIRE_HOURS)
    data = {"sub": email, "type": "email_verify", "exp": expire}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_password_reset_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_EXPIRE_HOURS)
    data = {"sub": email, "type": "password_reset", "exp": expire}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, expected_type: str) -> str | None:
    """Token'ı doğrular ve e-posta adresini döner. Geçersizse None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return payload.get("sub")
    except JWTError:
        return None


# ── FastMail Konfigürasyonu ──────────────────────────────────────────────────
def get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=settings.MAIL_STARTTLS,
        MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
        USE_CREDENTIALS=bool(settings.MAIL_USERNAME),
        VALIDATE_CERTS=True,
    )


def _is_email_configured() -> bool:
    return bool(settings.MAIL_USERNAME and settings.MAIL_PASSWORD)


# ── E-posta Şablonları ────────────────────────────────────────────────────────

def _verify_email_html(verify_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="tr">
    <body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155;">
        <h1 style="color: #a78bfa; margin-top: 0;">◈ PortfolioWeb</h1>
        <h2 style="color: #f1f5f9;">E-posta Adresinizi Doğrulayın</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Hesabınızı aktif etmek için aşağıdaki butona tıklayın.<br>
          Bu link <strong>24 saat</strong> süre ile geçerlidir.
        </p>
        <a href="{verify_url}" style="
          display: inline-block; margin: 24px 0;
          padding: 14px 32px; border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: white; text-decoration: none;
          font-weight: bold; font-size: 15px;
        ">✉️ E-posta Adresimi Doğrula</a>
        <p style="color: #64748b; font-size: 13px;">
          Bu e-postayı siz talep etmediyseniz, güvenle görmezden gelebilirsiniz.
        </p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
        <p style="color: #475569; font-size: 12px; margin: 0;">
          PortfolioWeb — Kişisel Finans Takip Platformu
        </p>
      </div>
    </body>
    </html>
    """


def _reset_password_html(reset_url: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html lang="tr">
    <body style="font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 40px;">
      <div style="max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 40px; border: 1px solid #334155;">
        <h1 style="color: #a78bfa; margin-top: 0;">◈ PortfolioWeb</h1>
        <h2 style="color: #f1f5f9;">Şifre Sıfırlama İsteği</h2>
        <p style="color: #94a3b8; line-height: 1.6;">
          Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.<br>
          Bu link <strong>1 saat</strong> süre ile geçerlidir.
        </p>
        <a href="{reset_url}" style="
          display: inline-block; margin: 24px 0;
          padding: 14px 32px; border-radius: 10px;
          background: linear-gradient(135deg, #dc2626, #f87171);
          color: white; text-decoration: none;
          font-weight: bold; font-size: 15px;
        ">🔑 Şifremi Sıfırla</a>
        <p style="color: #64748b; font-size: 13px;">
          Bu isteği siz yapmadıysanız, şifreniz değiştirilmeyecektir.
        </p>
        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
        <p style="color: #475569; font-size: 12px; margin: 0;">
          PortfolioWeb — Kişisel Finans Takip Platformu
        </p>
      </div>
    </body>
    </html>
    """


# ── Gönderim Fonksiyonları ────────────────────────────────────────────────────

async def send_verification_email(email: str, token: str):
    """Kayıt sonrası e-posta doğrulama linki gönderir."""
    if not _is_email_configured():
        # Geliştirme ortamında konsola yaz
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        print(f"\n[DEV] E-posta doğrulama linki:\n{verify_url}\n")
        return

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    message = MessageSchema(
        subject="✉️ PortfolioWeb — E-posta Adresinizi Doğrulayın",
        recipients=[email],
        body=_verify_email_html(verify_url),
        subtype=MessageType.html,
    )
    fm = FastMail(get_mail_config())
    await fm.send_message(message)


async def send_password_reset_email(email: str, token: str):
    """Şifre sıfırlama linki gönderir."""
    if not _is_email_configured():
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        print(f"\n[DEV] Şifre sıfırlama linki:\n{reset_url}\n")
        return

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    message = MessageSchema(
        subject="🔑 PortfolioWeb — Şifre Sıfırlama",
        recipients=[email],
        body=_reset_password_html(reset_url),
        subtype=MessageType.html,
    )
    fm = FastMail(get_mail_config())
    await fm.send_message(message)
