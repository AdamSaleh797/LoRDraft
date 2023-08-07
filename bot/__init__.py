import discord 


def run_discord_bot():
    intents = discord.Intents.default()
    intents.message_content = True

    TOKEN = 'MTEzNzkzOTY2MTU2Njc4MzY0OQ.G5A9mW.JZe24xFgnCB2NhIdBbn5QBg89QJrO_xc4eTKR0'
    client = discord.Client(intents = intents)

    @client.event
    async def on_ready():
        print(f'{client.user} is now running')

    @client.event
    async def on_message(message):

        # we do not want the bot to reply to itself
        if message.author.id == client.user.id:
            return 

        username = str(message.author)
        user_message = str(message.content)
        channel = str(message.channel)

        print(f"{username} said: '{user_message}' ({channel})")

        await message.channel.send(message.content)

        


    client.run(TOKEN)


run_discord_bot()

    