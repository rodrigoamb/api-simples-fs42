const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

const JWT_SECRET = "seu_segredo_aqui";
const JWT_EXPIRES_IN = "2h";

app.use(express.json());
app.use(cookieParser());

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "dc_store_online",
  password: "30267098",
  port: 5432,
});

//conectar com o banco de dados.
client
  .connect()
  .then(async () => {
    console.log("Conectado ao PostgreSQL");

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefone VARCHAR(15)
      );

      CREATE TABLE IF NOT EXISTS enderecos (
        id SERIAL PRIMARY KEY,
        cliente_id INT,
        rua VARCHAR(100),
        cidade VARCHAR(50),
        estado VARCHAR(2),
        cep VARCHAR(9),
        CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS produtos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        preco NUMERIC(10,2) NOT NULL,
        estoque INT DEFAULT 0,
        categoria_id INT,
        CONSTRAINT fk_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        cliente_id INT,
        data_pedido DATE DEFAULT CURRENT_DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        CONSTRAINT fk_cliente_pedido FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL
      );
      `);

    console.log("As tabelas foram criadas");
  })
  .catch((error) => {
    console.error("Erro ao conectar com o banco:", error);
  });

// ------ MIDDLEWARE -------

function autenticarToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Acesso negado. Faça o login." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido." });
    }

    req.user = user;
    next();
  });
}

// ----- AUTENTICAÇÃO -----

app.post("/usuarios", async (req, res) => {
  const { nome, email, senha } = req.body;

  const hash = await bcrypt.hash(senha, 10);

  try {
    await client.query(
      "INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)",
      [nome, email, hash]
    );

    res.status(201).json({ message: "Usuário criado com sucesso." });
  } catch (error) {
    res.status(400).json({ message: "Erro ao criar o usuário" });
    console.error(error);
  }
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  const result = await client.query("SELECT * FROM usuarios WHERE email = $1", [
    email,
  ]);

  const usuario = result.rows[0];

  if (!usuario) {
    return res.status(401).json({ message: "usuário não encontrado" });
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);

  if (!senhaValida) {
    return res.status(401).json({ message: "Senha inválida" });
  }

  // criar o jwt e responder com armazenamento do jwt nos cookies.
  const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, //em producao deve ser true.
    sameSite: "lax",
    maxAge: 7200000, //2 horas em ms
  });

  res.json({ message: "login realizado com sucesso." });
});

app.post("/logout", async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout realizado com sucesso!" });
});

app.get("/perfil", autenticarToken, async (req, res) => {
  const usuarioId = req.user.id;
  const result = await client.query(
    "SELECT id, nome, email FROM usuarios WHERE id = $1",
    [usuarioId]
  );

  res.json(result.rows[0]);
});

// ----- CLIENTES -------
app.get("/clientes", autenticarToken, async (req, res) => {
  const result = await client.query("SELECT * FROM clientes");

  res.json(result.rows);
});

app.get("/clientes/:id", autenticarToken, async (req, res) => {
  const ClientId = req.params.id;

  const result = await client.query("SELECT * FROM clientes WHERE id = $1", [
    ClientId,
  ]);

  res.json(result.rows[0]);
});

app.post("/clientes", autenticarToken, async (req, res) => {
  const { nome, email, telefone } = req.body;

  try {
    await client.query(
      "INSERT INTO clientes (nome, email, telefone) VALUES ($1, $2, $3)",
      [nome, email, telefone]
    );

    res.status(201).json({ message: "Cliente criado com sucesso" });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ message: "Erro ao criar cliente" });
  }
});

app.put("/clientes/:id", autenticarToken, async (req, res) => {
  const id = req.params.id;
  const { nome, email, telefone } = req.body;

  try {
    await client.query(
      "UPDATE clientes SET nome = $1, email = $2, telefone = $3 WHERE id = $4",
      [nome, email, telefone, id]
    );

    res.json({
      message: "Cliente atualizado com sucesso",
    });
  } catch (error) {
    console.error("Ocorreu um erro ao atualizar o cliente", error);
    res.status(500).json({ message: "Erro ao atualizar o cliente" });
  }
});

app.delete("/clientes/:id", autenticarToken, async (req, res) => {
  try {
    const id = req.params.id;
    await client.query("DELETE FROM clientes WHERE id = $1", [id]);
    res.json({ message: "Cliente Deletado" });
  } catch (error) {
    console.error("Ocorreu um erro ao deletar o cliente", error);
    res.status(500).json({ message: "Erro ao deletar o cliente" });
  }
});

// ---------- ENDEREÇOS ----------

app.get("/enderecos", autenticarToken, async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM enderecos");
    res.json(result.rows);
  } catch (error) {
    console.error("Ocorreu um erro ao trazer todos os endereços", error);
    res.status(500).json({ message: "Erro ao trazer todos os endereços" });
  }
});

app.get("/enderecos/:id", autenticarToken, async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM enderecos WHERE id = $1", [
      req.params.id,
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Ocorreu um erro ao trazer o endereço", error);
    res.status(500).json({ message: "Erro ao trazer o endereço" });
  }
});

app.post("/enderecos", autenticarToken, async (req, res) => {
  try {
    const { cliente_id, rua, cidade, estado, cep } = req.body;

    await client.query(
      "INSERT INTO enderecos (cliente_id, rua, cidade, estado, cep) VALUES ($1, $2, $3, $4, $5)",
      [cliente_id, rua, cidade, estado, cep]
    );

    res.status(201).json({ message: "Endereço criado com sucesso!" });
  } catch (error) {
    console.error("Ocorreu um erro ao criar o endereço", error);
    res.status(500).json({ message: "Erro ao criar o endereço" });
  }
});

app.put("/enderecos/:id", autenticarToken, async (req, res) => {
  try {
    const { cliente_id, rua, cidade, estado, cep } = req.body;
    await client.query(
      "UPDATE enderecos SET cliente_id = $1, rua = $2, cidade = $3, estado = $4, cep = $5 WHERE id = $6",
      [cliente_id, rua, cidade, estado, cep, req.params.id]
    );

    res.status(200).json({ message: "Endereço atualizado com sucesso" });
  } catch (error) {
    console.error("Ocorreu um erro ao editar o endereço", error);
    res.status(500).json({ message: "Erro ao editar o endereço" });
  }
});

app.delete("/enderecos/:id", autenticarToken, async (req, res) => {
  await client.query("DELETE FROM enderecos WHERE id = $1", [req.params.id]);
  res.json({ message: "Endereço deletado com sucesso" });
});

// ------ CATEGORIA -------

app.get("/categorias", autenticarToken, async (req, res) => {
  const result = await client.query("SELECT * FROM categorias");
  res.json(result.rows);
});

app.get("/categorias/:id", autenticarToken, async (req, res) => {
  const result = await client.query("SELECT * FROM categorias WHERE id = $1", [
    req.params.id,
  ]);
  res.json(result.rows[0]);
});

app.post("/categorias", autenticarToken, async (req, res) => {
  const { nome } = req.body;
  await client.query("INSERT INTO categorias (nome) VALUES ($1)", [nome]);
  res.status(201).json({ message: "Categoria criada!" });
});

app.put("/categorias/:id", autenticarToken, async (req, res) => {
  const { nome } = req.body;
  await client.query("UPDATE categorias SET nome = $1 WHERE id = $2", [
    nome,
    req.params.id,
  ]);
  res.json({ message: "Categoria atualizada!" });
});

app.delete("/categorias/:id", autenticarToken, async (req, res) => {
  await client.query("DELETE FROM categorias WHERE id = $1", [req.params.id]);
  res.json({ message: "Categoria deletada!" });
});

// ------ PRODUTOS --------

app.get("/produtos", autenticarToken, async (req, res) => {
  const result = await client.query(`
      SELECT p.*, c.nome AS categoria_nome
      FROM produtos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `);

  res.json(result.rows);
});

app.get("/produtos/:id", autenticarToken, async (req, res) => {
  const result = await client.query("SELECT * FROM produtos WHERE id =$1", [
    req.params.id,
  ]);
  res.json(result.rows[0]);
});

app.post("/produtos", autenticarToken, async (req, res) => {
  const { nome, preco, estoque, categoria_id } = req.body;

  await client.query(
    "INSERT INTO produtos (nome, preco, estoque, categoria_id) VALUES ($1, $2, $3, $4)",
    [nome, preco, estoque, categoria_id]
  );

  res.status(201).json({ message: "Produto criado com sucesso." });
});

app.put("/produtos/:id", autenticarToken, async (req, res) => {
  const { nome, preco, estoque, categoria_id } = req.body;
  const id = req.params.id;

  await client.query(
    "UPDATE produtos SET nome = $1, preco=$2, estoque=$3, categoria_id=$4 WHERE id = $5",
    [nome, preco, estoque, categoria_id, id]
  );

  res.status(200).json({ message: "Produto atualizado com sucesso" });
});

app.delete("/produtos/:id", autenticarToken, async (req, res) => {
  const id = req.params.id;

  await client.query("DELETE FROM produtos WHERE id =$1", [id]);

  res.json({ message: "Produto deletado com sucesso!" });
});

// ------ PEDIDOS --------

app.get("/pedidos", autenticarToken, async (req, res) => {
  const result = await client.query(`
      SELECT p.*, c.nome AS nome_cliente, c.email AS email_cliente 
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
    `);

  res.status(200).json(result.rows);
});

app.get("/pedidos/:id", autenticarToken, async (req, res) => {
  const result = await client.query("SELECT * FROM  pedidos WHERE id = $1", [
    req.params.id,
  ]);

  res.status(200).json(result.rows[0]);
});

app.post("/pedidos", autenticarToken, async (req, res) => {
  const { cliente_id, status } = req.body;
  await client.query(
    "INSERT INTO pedidos (cliente_id, status) VALUES ($1, $2)",
    [cliente_id, status]
  );

  res.status(201).json({ messagem: "Pedido criado" });
});

app.put("/pedidos/:id", autenticarToken, async (req, res) => {
  const { cliente_id, status } = req.body;

  await client.query(
    "UPDATE pedidos SET cliente_id= $1, status= $2 WHERE id = $3",
    [cliente_id, status, req.params.id]
  );

  res.status(200).json({ message: "pedido atualizado" });
});

app.delete("/pedidos/:id", autenticarToken, async (req, res) => {
  await client.query("DELETE from pedidos WHERE id = $1", [req.params.id]);

  res.json({ message: "pedido excluido" });
});

// iniciando o servidor

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
