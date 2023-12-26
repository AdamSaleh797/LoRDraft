"""Runs Bot"""

import discord
import responses

TOKEN = "MTEzNzkzOTY2MTU2Njc4MzY0OQ.G5A9mW.JZe24xFgnCB2NhIdBbn5QBg89QJrO_xc4eTKR0"


def run_discord_bot():
    """Runs Bot"""
    intents = discord.Intents.default()
    intents.message_content = True

    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f"{client.user} is now running")

    @client.event
    async def on_message(message):
        # we do not want the bot to reply to itself
        if message.author.id == client.user.id:
            return

        username = str(message.author)
        user_message = str(message.content)

        response = responses.handle_response(user_message, username)
        await message.channel.send(response)

    client.run(TOKEN)
