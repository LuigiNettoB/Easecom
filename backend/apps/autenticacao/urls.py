from django.urls import path

from apps.autenticacao.views import (
    CadastroView,
    EuView,
    FotoBannerView,
    FotoPerfilView,
    LoginView,
    RefreshView,
    TrocarSenhaView,
)

urlpatterns = [
    path("auth/cadastro", CadastroView.as_view(), name="auth-cadastro"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("eu", EuView.as_view(), name="eu"),
    path("eu/senha", TrocarSenhaView.as_view(), name="eu-trocar-senha"),
    path("eu/foto-perfil", FotoPerfilView.as_view(), name="eu-foto-perfil"),
    path("eu/banner", FotoBannerView.as_view(), name="eu-banner"),
]
