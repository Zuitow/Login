const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();
const path = require('path'); 

// Configurar a conexão com o banco de dados MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'phpmyadmin',
    password: 'paulo',
    database: 'mydb',
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        throw err;
    }
    console.log('Conexão com o banco de dados MySQL estabelecida.');
});

// Configurar a sessão
app.use(
    session({
        secret: 'Escreva aqui a senha para criptografar as sessões.',
        resave: true,
        saveUninitialized: true,
    })
);

app.use(express.static(path.join(__dirname, 'static')));

// Configuração de pastas com aquivos estáticos
//app.use('/img', express.static(__dirname + '/img'))

// Engine do Express para processar o EJS (templates)
// Lembre-se que para uso do EJS uma pasta (diretório) 'views', precisa existir na raiz do projeto.
// E que todos os EJS serão processados a partir desta pasta
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar EJS como o motor de visualização
app.set('view engine', 'ejs');

// Configuração das rotas do servidor HTTP
// A lógica ddo processamento de cada rota deve ser realizada aqui
app.get('/', (req, res) => {
    // Passe a variável 'req' para o template e use-a nas páginas para renderizar partes do HTML conforme determinada condição
    // Por exemplo de o usuário estive logado, veja este exemplo no arquivo views/partials/header.ejs
    res.render('pages/index', { req: req });
    // Caso haja necessidade coloque pontos de verificação para verificar pontos da sua logica de negócios
    console.log(`${req.session.username ? `Usuário ${req.session.username} logado no IP ${req.connection.remoteAddress}` : 'Usuário não logado.'}  `);
    //console.log(req.connection)
    ;
});

// Rota para a página de login
app.get('/login', (req, res) => {
    // Quando for renderizar páginas pelo EJS, passe parametros para ele em forma de JSON
    res.render('pages/login', { req: req });
});

app.get('/about', (req, res) => {
    res.render('pages/about', { req: req })
});


// Rota para processar o formulário de login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Verificar na tabela de usuários
    const queryUsers = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    db.query(queryUsers, [username, password], (err, results) => {
        if (err) {
            console.error('Erro ao verificar o login:', err);
            return res.redirect('/login_err');
        }

        if (results && results.length > 0) {
            const user = results[0];
            console.log('Login bem sucedido de Usuário: ' + user.username);
            req.session.loggedin = true;
            req.session.username = user.username;
            req.session.usertype = 'Usuário';
            // Adicione outros dados específicos do usuário, se necessário
            return res.status(200).redirect('/dashboard');
        } else {
            // Se não encontrado na tabela de usuários, verificar na tabela de administradores
            const queryAdmins = 'SELECT * FROM Administrador WHERE username = ? AND password = SHA1(?)';
            db.query(queryAdmins, [username, password], (err, results) => {
                if (err) {
                    console.error('Erro ao verificar o login:', err);
                    return res.redirect('/login_err');
                }

                if (results && results.length > 0) {
                    const admin = results[0];
                    console.log('Login bem sucedido de Administrador: ' + admin.username);
                    req.session.loggedin = true;
                    req.session.username = admin.username;
                    req.session.usertype = 'Administrador';
                    return res.redirect('/');
                } else {
                    console.log('Credenciais inválidas');
                    return res.redirect('/login_failed');
                }
            });
        }
    });
});

// Rotas para cadastrar
app.get('/cadastrar', (req, res) => {
    if (!req.session.loggedin) {
        res.render('pages/cadastrar', { req: req });
    } else {
        res.redirect('pages/dashboard', { req: req });
    }
});

// Rota para efetuar o cadastro de usuário no banco de dados
app.post('/cadastrar', (req, res) => {
    const { username, password } = req.body;

    // Verifica se o usuário já existe
    const query = 'SELECT * FROM users WHERE username = ? AND password = SHA1(?)';
    db.query(query, [username, password], (err, results) => {
        if (err) throw err;
        // Caso usuário já exista no banco de dados, redireciona para a página de cadastro inválido
        if (results.length > 0) {
            console.log(`Usuário ${username} já existe no banco de dados. redirecionando`);
            res.redirect('/register_failed');
        } else {
            // Cadastra o usuário caso não exista
            const query = 'INSERT INTO users (username, password) VALUES (?, SHA1(?))';
            console.log(`POST /CADASTAR -> query -> ${query}`);
            db.query(query, [username, password], (err, results) => {
                console.log(results);
                //console.log(`POST /CADASTAR -> results -> ${results}`);

                if (err) {
                    console.log(`ERRO NO CADASTRO: ${err}`);
                    throw err;
                }
                if (results.affectedRows > 0) {
                    req.session.loggedin = true;
                    req.session.username = username;
                    res.redirect('/register_ok');
                }
            });
        }
    });
});

app.post('/blogar', async (req, res) => {
    const { comentario } = req.body;
    const username = req.session.username;

    if (req.session.username){
        const username = req.session.username;
        console.log("ESTOU NO BLOGAR, DENTRO DO IF",username);
    }

    // Inserir a nova consulta no banco de dados
    const SQL = 'INSERT INTO blog (usuario, comentario) VALUES (?, ?)';
    db.query(SQL, [username, comentario], (err, result) => {
      if (err) {
        console.error('Erro ao comentar:', err);
        res.status(500).send('Erro ao comentar');
      } else {
        console.log(username+"comentou:"+comentario);
        
       res.redirect('/blogs'); 
      }
    });
  });


  app.get('/blogs', (req, res) => {
    if (req.session.loggedin) {
    if (req.session.usertype === "Administrador") {
    const query = 'SELECT * FROM blog';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Erro ao obter comentários:', err);
            res.status(500).send('Erro ao obter comentários');
        } else {
            // Renderiza a página "blogs" e passa os comentários para o template EJS
            res.render('pages/blogs', { comentarios: results, req: req }); // Certifique-se de passar o req
        }
    

    });
}
    }
});

app.get('/blog', (req, res) => {
    if (req.session.loggedin) {
        res.render('pages/blog', { req: req, username: req.session.username });
    } else {
        res.redirect('/login'); // ou qualquer outra rota para redirecionar usuários não autenticados
    }
});

app.get('/register_failed', (req, res) => {
    res.render('pages/register_failed', { req: req });
});

app.get('/register_ok', (req, res) => {
    res.render('pages/register_ok', { req: req });
});

app.get('/login_failed', (req, res) => {
    res.render('pages/login_failed', { req: req });
});

// Rota para a página do painel
app.get('/dashboard', (req, res) => {
    //
    //modificação aqui
    if (req.session.loggedin) {
        //res.send(`Bem-vindo, ${req.session.username}!<br><a href="/logout">Sair</a>`);
        // res.sendFile(__dirname + '/index.html');
        res.render('pages/dashboard', { req: req });
    } else {
        res.send('Faça login para acessar esta página. <a href="/">Login</a>');
    }
});

// Rota para processar a saida (logout) do usuário
// Utilize-o para encerrar a sessão do usuário
// Dica 1: Coloque um link de 'SAIR' na sua aplicação web
// Dica 2: Você pode implementar um controle de tempo de sessão e encerrar a sessão do usuário caso este tempo passe.
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Rota de teste
app.get('/teste', (req, res) => {
    res.render('pages/teste', { req: req });
});


app.listen(3000, () => {
    console.log('----Login (MySQL version)-----')
    console.log('Servidor rodando na porta 3000');
});
