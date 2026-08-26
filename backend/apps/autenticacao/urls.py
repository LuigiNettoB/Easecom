from django.urls import path

from apps.autenticacao.views import CadastroView, EuView, LoginView, RefreshView, TrocarSenhaView

urlpatterns = [
    path("auth/cadastro", CadastroView.as_view(), name="auth-cadastro"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", RefreshView.as_view(), name="auth-refresh"),
    path("eu", EuView.as_view(), name="eu"),
    path("eu/senha", TrocarSenhaView.as_view(), name="eu-trocar-senha"),
]
