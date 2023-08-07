import bot


def handle_response(message, user) -> str:
    p_message = message.lower()

    if p_message == "!queue":
        if user in bot.user_queue:
            return "You are already queued!"

        bot.user_queue.append(user)

        if len(bot.user_queue) == 2:
            return f"@{bot.user_queue[0]} has been matched against @{bot.user_queue[1]}"
            bot.user_queue.clear()

        return f"@{user} has been added to the queue"

    if p_message == "!exit":
        bot.user_queue.remove(user)
        return f"@{user} has exited the queue"

    if p_message == "!help":
        return "Welcome to the LoRDraft Test Bot.\n\nCurrent available commands:\n\t!queue: adds you to the draft queue\n\t!exit: removes you from the draft queue\n\nThanks!"

    return p_message
