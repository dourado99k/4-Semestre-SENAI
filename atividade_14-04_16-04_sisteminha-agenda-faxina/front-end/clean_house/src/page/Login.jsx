
const Login = () => {
    
  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4" style={{ width: "100%", maxWidth: "400px" }}>
        <h3 className="text-center mb-4">Login</h3>

        <form>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="Digite seu email"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              placeholder="Digite sua senha"
            />
          </div>

          <div className="mb-3 form-check">
            <input type="checkbox" className="form-check-input" id="lembrar" />
            <label className="form-check-label" htmlFor="lembrar">
              Lembrar-me
            </label>
          </div>

          <button type="submit" className="btn btn-primary w-100">
            Entrar
          </button>

          <div className="text-center mt-3">
            <small>
              Esqueceu a senha? <a href="#">Recuperar</a>
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;