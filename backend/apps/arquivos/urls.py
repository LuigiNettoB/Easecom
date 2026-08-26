from django.urls import path

from apps.arquivos.views import ArquivoDetalheView, ArquivoUploadView

urlpatterns = [
    path("arquivos", ArquivoUploadView.as_view(), name="arquivos-upload"),
    path("arquivos/<uuid:id>", ArquivoDetalheView.as_view(), name="arquivos-detalhe"),
]
