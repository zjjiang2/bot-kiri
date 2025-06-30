# bot-kiri

**Kiri** is a multipurpose Discord bot built with utility commands to improve server experience amongst friends.

## ✨ Features

- **`/party [max_players]`** – Starts an interaction box where users can join a party. Once **`max_players`** have joined, the bot notifies all participants.

## 🚀 Installation

### Prerequisites

- Node.js 
- Discord Bot Token
- A Discord server where you have permission to add bots

### To run it locally:

1. Clone this repository:

   ```bash
   git clone https://github.com/zjjiang2/bot-kiri.git
   cd bot-kiri
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file inside the `app.js` directory and fill in the fields:

   ```env
   DISCORD_TOKEN="your_bot_token"
   CLIENT_ID = "your_client_id"
   ```

4. Run the bot:

   ```bash
   node ./app.js
   ```

## 🔎 Feedbacks

Feedbacks on bugs or suggestions to improve the bot's commands/features are greatly appreciated. 🙏

## 📄 License

[MIT](LICENSE)
