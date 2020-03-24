/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { Manager as LavacordManager, LavalinkNodeOptions, ManagerOptions, DiscordPacket } from "lavacord";
import { Client as DiscordClient } from "discord.js";

export class Manager extends LavacordManager {
    public constructor(readonly client: DiscordClient, nodes: LavalinkNodeOptions[], options: ManagerOptions) {
        super(nodes, options);

        client.once("ready", () => {
            this.user = client.user!.id;
            this.shards = client.options.shardCount || 1;
        });

        if (client.guilds.cache) {
            client.ws
                .on("VOICE_SERVER_UPDATE", this.voiceServerUpdate.bind(this))
                .on("VOICE_STATE_UPDATE", this.voiceStateUpdate.bind(this))
                .on("GUILD_CREATE", async data => {
                    for (const state of data.voice_states) await this.voiceStateUpdate({ ...state, guild_id: data.id });
                });
        } else {
            client.on("raw", async (packet: DiscordPacket) => {
                switch (packet.t) {
                    case "VOICE_SERVER_UPDATE":
                        await this.voiceServerUpdate(packet.d);
                        break;
                    case "VOICE_STATE_UPDATE":
                        await this.voiceStateUpdate(packet.d);
                        break;
                    case "GUILD_CREATE":
                        for (const state of packet.d.voice_states) await this.voiceStateUpdate({ ...state, guild_id: packet.d.id });
                        break;
                }
            });
        }
    }

    // @ts-ignore
    public send(packet: DiscordPacket): void {
        if (this.client.guilds.cache) {
            const guild = this.client.guilds.cache.get(packet.d.guild_id);
            if (guild) return this.client.ws.shards.get(guild.shardID)!.send(packet);
        } else {
            // @ts-ignore
            const guild = this.client.guilds.get(packet.d.guild_id);
            // @ts-ignore
            if (guild) return this.client.ws.send(packet);
        }
    }
}
