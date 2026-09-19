# ⚡ Poke X Loot Analyzer

Um site simples e **100% gratuito** para analisar as sessões de loot do Poke X e
compartilhar com os amigos. Você cola o JSON que o analiser do jogo gera e vê um
dashboard completo: profit, dano por elemento, drops, inimigos e um **ranking**
entre todos os amigos.

- **Sem servidor** para manter — é um único arquivo `index.html`.
- **Banco de dados grátis** com [Supabase](https://supabase.com) (plano free).
- **Hospedagem grátis** no GitHub Pages.

---

## 🚀 Como colocar no ar (passo a passo)

### 1. Criar o banco de dados (Supabase)

1. Crie uma conta grátis em <https://supabase.com> e clique em **New project**.
2. Dê um nome, escolha uma senha e a região mais perto (ex.: *São Paulo*).
3. Quando o projeto abrir, vá em **SQL Editor** → **New query**.
4. Abra o arquivo [`schema.sql`](./schema.sql) deste repositório, copie **tudo**,
   cole no editor e clique em **Run**. Isso cria a tabela `sessions`.
5. Vá em **Project Settings** (engrenagem) → **API** e copie:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - a chave **anon public**

> A chave *anon* é pública de propósito — ela só pode **ler** e **inserir** sessões,
> graças às regras de segurança (RLS) que já vêm no `schema.sql`. Ninguém consegue
> apagar ou editar dados pela web.

### 2. Publicar o site (GitHub Pages)

1. Este repositório já tem o `index.html`. Vá em **Settings** → **Pages**.
2. Em *Build and deployment* → *Source*, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)` e clique em **Save**.
4. Em ~1 minuto seu site fica no ar num link tipo
   `https://davideruk.github.io/poke-loot-analyzer/`.

### 3. Conectar o site ao banco

1. Abra o site publicado e vá na aba **⚙️ Config**.
2. Cole a **Project URL** e a **anon public key** do Supabase e clique em
   **Salvar e conectar**.
3. Pronto! Agora dá pra **salvar sessões** e ver o **Ranking**.

> Cada amigo faz esse passo 3 uma vez no navegador dele (a config fica salva
> localmente). Todos usam o **mesmo** URL e chave para caírem no mesmo banco/ranking.

---

## 🕹️ Como usar no dia a dia

1. No jogo, gere o JSON do analiser de loot.
2. No site, aba **📥 Importar**, cole o JSON (ou abra o arquivo) e clique em **Analisar**.
3. Veja o **📊 Dashboard** com os gráficos.
4. Clique em **💾 Salvar no banco** para entrar no **🏆 Ranking**.

Dá pra testar sem banco nenhum: clique em **Usar exemplo** e depois **Analisar**.

---

## 📂 Arquivos

| Arquivo        | O que é                                                        |
|----------------|---------------------------------------------------------------|
| `index.html`   | O site inteiro (dashboard + ranking + config). Um arquivo só. |
| `schema.sql`   | Script que cria a tabela no Supabase.                         |
| `README.md`    | Este guia.                                                    |

---

## 💡 Ideias para evoluir depois

- **Loot split**: dividir o profit entre os players de uma hunt em grupo.
- **Histórico por player**: gráfico de evolução do profit/hora ao longo do tempo.
- **Filtro por período** no ranking (dia / semana / mês).
- **Login simples** (Supabase Auth) se um dia quiser controlar quem envia.
- **Exportar** o dashboard como imagem para postar no grupo.

Feito para uso entre amigos. Divirtam-se! ⚡
