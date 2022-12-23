import express from "express";
import pg from "pg";
import cors from 'cors';
import { v4 as uuidV4 } from "uuid";
import { nanoid } from "nanoid";

const { Pool } = pg;

const connection = new Pool({
  user: "postgres",
  host: "localhost",
  port: 5432,
  database: "shortly_bd",
  password: "ra-16180339887",
});

const app = express();
app.use(express.json());
app.use(cors());

app.get("/categories", async (req, res) => {
  const categories = await connection.query("SELECT * FROM categories");
  res.send(categories.rows);
});

async function userNameExist(email) {

  const userNameExist = await connection.query(
    "SELECT * FROM usuario u WHERE u.email = ($1)",
    [email]
  );

  const emailExist = userNameExist.rows[0];

  if (emailExist) {
    return true;
  } else {
    return false;
  }

}


app.post("/signup", async (req, res) => {
  //POST THUNDERCLIENT
  /*   {
      "name":"joao",
      "email":"joaoneryrafael@gmail.com",
      "password":"1234", 
      "confirmPassword":"1234"
    } */
  const { name, email, password, confirmPassword } = req.body;

  //name não pode estar vazio ⇒ nesse caso, deve retornar status 400
  if (!name) {
    res.status(422).send("name vazio");
    return;
  }

  //name não pode ser um nome de categoria já existente ⇒ nesse caso deve retornar status 409
  if (await userNameExist(email)) {
    res.status(409).send("email já cadastrado!");
    return;
  }

  //nao requisito
  if (password !== confirmPassword) {
    res.status(422).send("senha diferente de confirmação!");
    return;
  }

  await connection.query(
    "INSERT INTO usuario (name,email,password) VALUES ($1,$2,$3)",
    [name, email, password]
  );

  res.status(201).send("SUCESSO na Inserção do usuário.");
});

async function isUserSignUp(email, password) {
  let errorMsg = "";
  //usuarioExiste ?
  if (!await userNameExist(email)) {
    errorMsg += "Email não cadastrado";
    return errorMsg;
  }

  const user = await connection.query(
    `SELECT * from usuario u WHERE u.email = $1 AND u.password = $2`,
    [email, password]);

  if (user.rows.length > 0) {
    return errorMsg;;
  } else {
    errorMsg += "Senha incorreta";
    return errorMsg;
  };

}

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  const token = uuidV4();

  //name não pode estar vazio ⇒ nesse caso, deve retornar status 400
  if (!email || !password) {
    res.status(422).send("um dos campos vazio");
    return;
  }

  const errorMsg = await isUserSignUp(email, password);
  if (errorMsg) {
    res.status(422).send(errorMsg);
    return;
  }

  await connection.query(
    "INSERT INTO session (token, email) VALUES ($1,$2)",
    [token, email]
  );

  res.status(201).send(token);
});

async function authorizationValidated(authorization) {

  const result = await connection.query(
    `SELECT * FROM session s WHERE s.token = ($1)`,
    [authorization]);

  if (result.rows.length > 0) {
    return true;
  } else {
    return false;
  }
}

app.post("/urls/shorten", async (req, res) => {

  const { authorization } = req.headers;
  const token = authorization?.replace("Bearer ", "");
  const { url } = req.body;


  if (!authorization) {
    res.status(401).send("header não enviado");
    return;
  } else if (!await authorizationValidated(token)) {
    res.status(401).send("Token inválido");
    return;
  }

  if (!token) {
    res.send(401).status("Sem token!")
    return;
  }


  if (!url) {
    res.status(422).send("Sem url!")
    return;
  }

  if (url.substring(0, 8) !== 'https://' && url.substring(0, 7) !== 'http://') {
    res.status(422).send("Url não começa com https:// ou http://");
    return;
  }


  const result = await connection.query(
    `SELECT s.email FROM session s WHERE s.token = $1`,
    [token]
  );

  const email = result.rows[0].email;
  if (!email) {
    res.status(422).send("Token inválido!");
  }

  //preciso buscar email, original link e shortly link
  //inserir na tabela link

  const shortUrl = nanoid(8);


  await connection.query(
    `INSERT INTO link ("email","originalLink","shortUrl") VALUES($1,$2,$3)`,
    [email, url, shortUrl]);


  res.status(201).send({ shortUrl: shortUrl });
})


app.get("/urls/:id", async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404).send("Não tem id");
    return;
  }

  const result = await connection.query(
    `SELECT * FROM link l WHERE l.id =$1`,
    [id]);

  const link = result.rows[0];
  if (!link) {
    res.status(404).send("Id não existente na base de dados")
    return;
  }


  const objGetUrl = {
    id: link.id,
    shotUrl: link.shortUrl,
    url: link.originalLink
  }

  res.send(objGetUrl)
});



app.get("/urls/open/:shortUrl", async (req, res) => {
  const shortUrl = req.params.shortUrl;

  if (!shortUrl) {
    res.status(404).send("Não tem shortUrl");
    return;
  }

  const result = await connection.query(
    `SELECT l."originalLink" FROM link l WHERE l."shortUrl" =$1`,
    [shortUrl]);

  const url = result.rows[0].originalLink;


  if (!url) {
    res.status(404).send("url não existe")
    return;
  }

  await connection.query(
    `UPDATE link l SET "visitCount" = "visitCount"+1 WHERE l."shortUrl" = $1`,
    [shortUrl])

  res.redirect(`${url}`);
  return;
  //res.send(objGetUrl)
});


async function deleteUrl(id) {
  await connection.query(
    `DELETE FROM link l WHERE l.id =$1`,
    [id])
}

app.delete("/urls/:id", async (req, res) => {

  const { authorization } = req.headers;
  const token = authorization?.replace("Bearer ", "");
  const id = req.params.id;

  if (!id) {
    res.status(404).send("Não tem id");
    return;
  }

  if (!authorization || !token) {
    res.status(401).send("Authorization incorreto");
    return;
  }

  const user = await connection.query(
    `SELECT l."originalLink" FROM link l, session s WHERE l.id = $1 AND s.token = $2`,
    [id, token]);

  const isUserOwnerUrl = user.rows.length > 0 ? true : false;

  if (!isUserOwnerUrl) {
    res.status(401).send("Url não pertence ao usuário");
    return;
  } else {
    await deleteUrl(id);
    res.status(204).send("url encurtada excluída!")
    return;
  }

});


app.get("/users/me", async (req, res) => {
  const { authorization } = req.headers;
  const token = authorization?.replace("Bearer ", "");

  if (!await authorizationValidated(token)) {
    res.status(401).send("invalid authorizantion ");
    return;
  }

  const id = await connection.query(
    `
    SELECT u.id 
    FROM usuario u
    JOIN session s
    ON s.token = $1 AND s.email = u.email
    `,
    [token]
  );

  const idUser = id.rows[0].id;

  if(!idUser){
    res.status(404).send("Usuário não existe");
  }

  const result = await connection.query(
    `
    SELECT u.id,u.name,u.email, SUM(l."visitCount") as "visitCount"
    FROM usuario u
    JOIN link l 
    ON u.email = l.email AND u.id = $1
    GROUP BY u.id, u.name,u.email
    `,
    [idUser]
  );

  const users = result.rows;

  for (let i = 0; i < users.length; i++) {
    const links = await connection.query(
      `
        SELECT l.id,l."shortUrl",l."originalLink" as url, l."visitCount"
        FROM link l  
        WHERE l.email = $1
        `,
      [users[i].email]
    );

    const shortnedUrls = links.rows;
    delete shortnedUrls.email;

    users[i] = { ...users[i], shortnedUrls }
  }

    res.status(200).send(users);
});

app.get('/ranking',async(req,res)=>{
  const result = await connection.query(
    `SELECT u.id, u.name, COUNT(l."visitCount") as "linksCount", SUM(l."visitCount") as "visitCount"  
    FROM usuario u
    JOIN link l 
    ON u.email = l.email
    GROUP BY u.id, u.name,u.email
    ORDER BY "visitCount" DESC
    LIMIT 10
    `);

  res.send(result.rows);
});

app.listen(4000, () => {
  console.log("Server listening on port 4000.");
});