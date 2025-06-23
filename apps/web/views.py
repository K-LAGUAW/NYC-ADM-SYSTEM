from django.shortcuts import render

def shipments(request):
    return render(request, 'pages/shipments.html')

def orders(request):
    return render(request, 'pages/orders.html')