from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from core.security import verify_password, get_password_hash, create_access_token
from core.email_service import (
    create_email_verification_token,
    create_password_reset_token,
    verify_token,
    send_verification_email,
    send_password_reset_email,
)
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── Kayıt ────────────────────────────────────────────────────────────────────
@router.post("/register", response_model=schemas.UserOut, status_code=201)
@limiter.limit("5/minute")
async def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Şifre en az 8 karakter olmalıdır.")

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı.")

    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pwd, is_verified=False)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Doğrulama e-postası gönder
    token = create_email_verification_token(new_user.email)
    await send_verification_email(new_user.email, token)

    return new_user


# ── Giriş ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı e-posta veya şifre",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="E-posta adresiniz henüz doğrulanmadı. Lütfen gelen kutunuzu kontrol edin.",
        )

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ── E-posta Doğrulama ─────────────────────────────────────────────────────────
@router.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    email = verify_token(token, expected_type="email_verify")
    if not email:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş doğrulama linki.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if user.is_verified:
        return {"message": "E-posta adresiniz zaten doğrulanmış."}

    user.is_verified = True
    db.commit()
    return {"message": "E-posta adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz."}


# ── Doğrulama E-postasını Yeniden Gönder ─────────────────────────────────────
@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, body: schemas.UserBase, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # Güvenlik: kullanıcı bulunsun ya da bulunmasın aynı cevabı ver (enumeration önlemi)
    if user and not user.is_verified:
        token = create_email_verification_token(user.email)
        await send_verification_email(user.email, token)
    return {"message": "Eğer bu e-posta ile kayıtlı doğrulanmamış bir hesap varsa, doğrulama e-postası gönderildi."}


# ── Şifremi Unuttum ───────────────────────────────────────────────────────────
@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: schemas.UserBase, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    # Güvenlik: enumeration önlemi
    if user:
        token = create_password_reset_token(user.email)
        await send_password_reset_email(user.email, token)
    return {"message": "Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama linki gönderildi."}


# ── Şifre Sıfırla ─────────────────────────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(body: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    email = verify_token(body.token, expected_type="password_reset")
    if not email:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş şifre sıfırlama linki.")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Yeni şifre en az 8 karakter olmalıdır.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    user.hashed_password = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz."}
