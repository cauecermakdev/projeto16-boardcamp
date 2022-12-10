import express from "express";
import pg from "pg";

const { Pool } = pg;

const connection = new Pool({
  user: "postgres",
  host: "localhost",
  port: 5432,
  database: "boardcamp",
  password: "ra-16180339887",
});

const app = express();
app.use(express.json());

app.get("/categories", async (req, res) => {
  const categories = await connection.query("SELECT * FROM categories");
  res.send(categories.rows);
});

async function categoryNameExist(name){

   const elementsWithName = await connection.query(
    "SELECT * FROM categories WHERE categories.name = ($1)",
    [name]
  );

  const nameExist = elementsWithName.rows[0];

  if(nameExist){
    return true;
  }else{
    return false;
  }

}


app.post("/categories", async (req, res) => {
  const { name } = req.body;
  
  //name não pode estar vazio ⇒ nesse caso, deve retornar status 400
  if(!name){
    res.status(400).send("name vazio");
    return;
  }

  //name não pode ser um nome de categoria já existente ⇒ nesse caso deve retornar status 409
  if(await categoryNameExist(name)){
    res.status(409).send("name já existe!");
    return;
  }

  await connection.query(
    "INSERT INTO categories (name) VALUES ($1)",
    [name]
  );

  res.sendStatus(201);
});


async function nameGameExist(name){
  const nameGameList = await connection.query(
    "SELECT * FROM games WHERE games.name = ($1)",
    [name]
    );

    const nameExist = nameGameList.rows[0];

    if(nameExist){
      return true;
    }else{
      console.log("name n existe");
      return false;
    }
}

function errorGamesPost(gamesPostObj){
  let errorMessage="";
  if(!gamesPostObj.name){
    errorMessage += "nome vazio |";
  }
  if(gamesPostObj.stockTotal < 0 || gamesPostObj.pricePerDay < 0 ){
    errorMessage += "stockTotal ou pricePerDay < 0 |";
  }
  console.log("errorMessage",errorMessage);
  return errorMessage;

}

app.post("/games", async (req, res) => {
  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
  console.log(req.body);

  const error400 = errorGamesPost(req.body);
  if(error400){
    console.log("entra erro 400");
    res.status(400).send(error400);
    return;
  }

   if(await nameGameExist(name)){
    res.status(409).send("game name already exists");
    return;
  }

  await connection.query(
    `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`,
    [name, image, stockTotal, categoryId, pricePerDay]
  );

  res.sendStatus(201);
});


app.get("/games", async (req, res) => {
  const games = await connection.query(
    `SELECT games.*, categories.name as "categoryName" FROM games JOIN categories ON games."categoryId" = categories.id;`
  );
  
  console.log(games.rows);

  //const categoryNameSearch = await connection.query("SELECT categories.name FROM categories WHERE categories.id = ($1)",[games[0].id]);;

 /*  const objetoGames = {
    id: games.id,
    name: games.name,
    image: games.img,
    stockTotal: games.stockTotal,
    categoryId: games.categoryId,
    pricePerDay: games.pricePerDay,
    categoryName: categoryNameSearch
  } */

  res.send(games.rows);
});

app.get("/api/products", async (req, res) => {
  const products = await connection.query("SELECT * FROM produtos");
  res.send(products.rows);
});

app.get("/api/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    return res.sendStatus(400);
  }

  const product = await connection.query("SELECT * FROM produtos WHERE id=$1", [
    id,
  ]);

  res.status(200).send(product.rows[0]);
});

app.post("/api/products", async (req, res) => {
  const { nome, preco, condicao } = req.body;

  await connection.query(
    "INSERT INTO produtos (nome, preco, condicao) VALUES ($1, $2, $3)",
    [nome, preco, condicao]
  );

  res.sendStatus(201);
});

app.listen(4000, () => {
  console.log("Server listening on port 4000.");
});