"""Handles Responses"""

import queue


def handle_response(message, user) -> str:
    """Handles Responses"""

    p_message = message.lower()

    if p_message == "!queue":
        if user in queue.user_queue:
            return "You are already queued!"

        queue.user_queue.append(user)

        if len(queue.user_queue) == 2:
            user1 = queue.user_queue[0]
            user2 = queue.user_queue[1]
            queue.user_queue.clear()
            return f"@{user1} has been matched against @{user2}"

        return f"@{user} has been added to the queue"

    if p_message == "!exit":
        queue.user_queue.remove(user)
        return f"@{user} has exited the queue"

    if p_message == "!help":
        return "Welcome to the LoRDraft Test Bot.\n\nCurrent available commands:\n\
        \t!queue: adds you to the draft queue\n\t!exit: removes you from the draft\
         queue\n\nThanks!"

    return p_message
