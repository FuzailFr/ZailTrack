<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZailTrack - Masuk</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body class="d-flex align-items-center justify-content-center">

<div class="container p-3" style="max-width: 400px;">
    <div class="card card-custom p-4 fade-in">
        <h3 class="text-center fw-bold mb-4">🖤 ZailTrack</h3>
        
        <div id="loginArea">
            <form id="loginForm">
                <div class="mb-3">
                    <label class="form-label small text-muted">Username</label>
                    <input type="text" class="form-control" id="logUser" required>
                </div>
                <div class="mb-4">
                    <label class="form-label small text-muted">Password</label>
                    <input type="password" class="form-control" id="logPass" required>
                </div>
                <button type="submit" class="btn btn-premium w-100 py-2">Sign In</button>
            </form>
            <p class="text-center small text-muted mt-3 mb-0">Belum punya akun? <a href="#" onclick="switchForm()" class="text-white fw-semibold">Daftar</a></p>
        </div>

        <div id="registerArea" class="d-none">
            <form id="regForm">
                <div class="mb-3">
                    <label class="form-label small text-muted">Username Baru</label>
                    <input type="text" class="form-control" id="regUser" required>
                </div>
                <div class="mb-4">
                    <label class="form-label small text-muted">Password</label>
                    <input type="password" class="form-control" id="regPass" required>
                </div>
                <button type="submit" class="btn btn-premium w-100 py-2">Buat Akun</button>
            </form>
            <p class="text-center small text-muted mt-3 mb-0">Sudah punya akun? <a href="#" onclick="switchForm()" class="text-white">Login</a></p>
        </div>
    </div>
</div>

<script src="assets/js/app.js"></script>
<script>
    function switchForm() {
        document.getElementById('loginArea').classList.toggle('d-none');
        document.getElementById('registerArea').classList.toggle('d-none');
    }
    document.getElementById('loginForm').addEventListener('submit', authLogin);
    document.getElementById('regForm').addEventListener('submit', authRegister);
</script>
</body>
</html>