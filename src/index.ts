/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Manager as LavacordManager, LavalinkNodeOptions, DiscordPacket, ManagerOptions } from "lavacord";
import { Client as DiscordClient } from "discord.js";

export * from "lavacord";

export class Manager extends LavacordManager {
    public constructor(readonly client: DiscordClient, nodes: LavalinkNodeOptions[], options?: ManagerOptions) {
        super(nodes, options || {});

        this.send = packet => {
            if (this.client.guilds.cache) {
                const guild = this.client.guilds.cache.get(packet.d.guild_id);
                if (guild) return guild.shard.send(packet);
            } else {
                // @ts-ignore
                const guild = this.client.guilds.get(packet.d.guild_id);
                // @ts-ignore
                if (guild) return typeof this.client.ws.send === "function" ? this.client.ws.send(packet) : guild.shard.send(packet);
            }
        };

        client.once("ready", () => {
            this.user = client.user!.id;
            this.shards = client.options.shardCount || 1;
        });

        if (client.guilds.cache && typeof (this.client.ws as any).send === "undefined") {
            client.ws
                .on("VOICE_SERVER_UPDATE", this.voiceServerUpdate.bind(this))
                .on("VOICE_STATE_UPDATE", this.voiceStateUpdate.bind(this))
                .on("GUILD_CREATE", async data => {
                    for (const state of data.voice_states) await this.voiceStateUpdate({ ...state, guild_id: data.id });
                });
        } else {
            // @ts-ignore
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

}
