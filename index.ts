import mysql, { Connection } from 'mysql2/promise';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });
app.register(cors);

// Configurações do banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'velvet'
};

// Criar conexão com o banco de dados
async function createConnection(): Promise<Connection> {
    return await mysql.createConnection(dbConfig);
}

// Rota POST - Adicionar novo sapato
app.post('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => { // Extrai nome e preço do corpo da requisição

    let conn: Connection | null = null;
    const { nome, preco } = request.body as { nome?: string; preco?: number };

    if (!nome || !preco) {  // Validação dos dados recebidos
        return reply.status(400).send({ 
            mensagem: "Nome e preço do sapato são obrigatórios!",
            erro: "DADOS_INCOMPLETOS"
        });
    }

    try {
        conn = await createConnection();   // Executa a query INSERT com prepared statements para evitar SQL injection
        const [result] = await conn.execute(
            "INSERT INTO sapatos (nome, preco) VALUES (?, ?)",
            [nome, preco]
        );

        return reply.status(201).send({    // Retorna sucesso 201 (Created) com mensagem e ID do novo registro
            mensagem: "Sapato adicionado com sucesso!",
            id: (result as any).insertId
        });
    } catch (erro: any) { //mensagen de erro
        app.log.error("Erro ao adicionar sapato:", erro);
        return reply.status(500).send({ 
            mensagem: "Erro interno ao adicionar o sapato.",
            erro: erro.code
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Rota GET - Listar todos os sapatos
app.get('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;
    
    try {
        conn = await createConnection();
        const [sapatos] = await conn.query("SELECT * FROM sapatos");
        
        return reply.send(sapatos);
    } catch (erro: any) {
        app.log.error("Erro ao buscar sapatos:", erro);
        return reply.status(500).send({ 
            mensagem: "Erro interno ao buscar sapatos.",
            erro: erro.code
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Rota GET - Buscar sapato por ID
// Rota GET - Listar todos os sapatos
app.get('/sapatos', async (request: FastifyRequest, reply: FastifyReply) => {
    let conn: Connection | null = null;
    
    try {
        // Cria uma nova conexão com o banco de dados
        conn = await createConnection();
        
        // Executa a query para buscar todos os sapatos
        // [sapatos] usa destructuring para pegar o primeiro elemento do array de resultados
        const [sapatos] = await conn.query("SELECT * FROM sapatos");
        
        // Retorna a lista de sapatos com status 200 (OK)
        return reply.send(sapatos);
    } catch (erro: any) {
        // Log do erro no console do servidor
        app.log.error("Erro ao buscar sapatos:", erro);
        
        // Retorna erro 500 (Internal Server Error) para o cliente
        return reply.status(500).send({ 
            mensagem: "Erro interno ao buscar sapatos.",
            erro: erro.code // Inclui o código de erro do MySQL se disponível
        });
    } finally {
        // Garante que a conexão será fechada, mesmo se ocorrer erro
        if (conn) await conn.end();
    }
});

// Rota GET - Buscar sapato por ID
app.get('/sapatos/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    let conn: Connection | null = null;
    
    // Converte o parâmetro de string para número
    const id = parseInt(request.params.id);
    
    // Valida se o ID é um número válido
    if (isNaN(id)) {
        return reply.status(400).send({ 
            mensagem: "ID inválido!",
            erro: "ID_INVALIDO" // Código de erro personalizado
        });
    }

    try {
        conn = await createConnection();
        
        // Busca o sapato pelo ID usando prepared statement (? previne SQL injection)
        const [sapatos] = await conn.query("SELECT * FROM sapatos WHERE id = ?", [id]);
        
        // Verifica se encontrou resultados
        if (!Array.isArray(sapatos) || sapatos.length === 0) {
            return reply.status(404).send({ 
                mensagem: "Sapato não encontrado!",
                erro: "NAO_ENCONTRADO" // Código de erro para registro não encontrado
            });
        }
        
        // Retorna o primeiro sapato encontrado (deveria ser único)
        return reply.send(sapatos[0]);
    } catch (erro: any) {
        app.log.error("Erro ao buscar sapato:", erro);
        return reply.status(500).send({ 
            mensagem: "Erro interno ao buscar sapato.",
            erro: erro.code
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Rota PUT - Atualizar sapato
app.put('/sapatos/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    let conn: Connection | null = null;
    const id = parseInt(request.params.id);
    
    // Extrai nome e preço do corpo da requisição
    const { nome, preco } = request.body as { nome?: string; preco?: number };

    // Validação do ID
    if (isNaN(id)) {
        return reply.status(400).send({ 
            mensagem: "ID inválido!",
            erro: "ID_INVALIDO"
        });
    }

    // Valida se pelo menos um campo foi fornecido para atualização
    if (!nome && !preco) {
        return reply.status(400).send({ 
            mensagem: "Nenhum dado fornecido para atualização!",
            erro: "DADOS_INCOMPLETOS"
        });
    }

    try {
        conn = await createConnection();
        
        // Verifica se o sapato existe antes de tentar atualizar
        const [sapatos] = await conn.query("SELECT id FROM sapatos WHERE id = ?", [id]);
        if (!Array.isArray(sapatos) || sapatos.length === 0) {
            return reply.status(404).send({ 
                mensagem: "Sapato não encontrado!",
                erro: "NAO_ENCONTRADO"
            });
        }

        // Constrói a query dinamicamente com base nos campos fornecidos
        const fieldsToUpdate = [];
        const values = [];
        
        if (nome) {
            fieldsToUpdate.push("nome = ?"); // Adiciona campo nome à query
            values.push(nome); // Adiciona valor à lista de valores
        }
        
        if (preco) {
            fieldsToUpdate.push("preco = ?"); // Adiciona campo preço à query
            values.push(preco); // Adiciona valor à lista de valores
        }
        
        values.push(id); // Adiciona o ID para a cláusula WHERE
        
        // Executa a atualização com a query montada dinamicamente
        await conn.execute(
            `UPDATE sapatos SET ${fieldsToUpdate.join(", ")} WHERE id = ?`,
            values
        );

        return reply.send({ mensagem: "Sapato atualizado com sucesso!" });
    } catch (erro: any) {
        app.log.error("Erro ao atualizar sapato:", erro);
        return reply.status(500).send({ 
            mensagem: "Erro interno ao atualizar sapato.",
            erro: erro.code
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Rota DELETE - Remover sapato
app.delete('/sapatos/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    let conn: Connection | null = null;
    const id = parseInt(request.params.id);
    
    if (isNaN(id)) {
        return reply.status(400).send({ 
            mensagem: "ID inválido!",
            erro: "ID_INVALIDO"
        });
    }

    try {
        conn = await createConnection();
        
        // Verifica se o sapato existe antes de tentar deletar
        const [sapatos] = await conn.query("SELECT id FROM sapatos WHERE id = ?", [id]);
        if (!Array.isArray(sapatos) || sapatos.length === 0) {
            return reply.status(404).send({ 
                mensagem: "Sapato não encontrado!",
                erro: "NAO_ENCONTRADO"
            });
        }

        // Executa a exclusão
        await conn.execute("DELETE FROM sapatos WHERE id = ?", [id]);

        return reply.send({ mensagem: "Sapato removido com sucesso!" });
    } catch (erro: any) {
        app.log.error("Erro ao remover sapato:", erro);
        return reply.status(500).send({ 
            mensagem: "Erro interno ao remover sapato.",
            erro: erro.code
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Inicializar o servidor
const start = async () => {
    try {
        // Inicia o servidor na porta 8000 e aceita conexões de qualquer IP
        await app.listen({ port: 8000, host: '0.0.0.0' });
        console.log(`Servidor rodando em http://localhost:8000`);
    } catch (err) {
        // Se ocorrer erro na inicialização, mostra no console e encerra o processo
        console.error("Erro ao iniciar servidor:", err);
        process.exit(1); // Código de saída 1 indica erro
    }
};

// Inicia o servidor chamando a função start()
start();