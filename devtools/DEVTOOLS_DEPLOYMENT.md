# BIONIC Floorplan DevTools — Deployment & Architecture Guide

## 1. Architectural Overview

The project maintains strict physical and logical decoupling between the production People Tracking application and the internal Floorplan DevTools:

```
Modernize/
├── packages/typescript/
│   ├── main/                 ← Production People Tracking Frontend
│   │                            - Zero dependencies on devtools
│   │                            - Independent production build
│   │
│   └── devtools/             ← Headless Floorplan Detection Engine
│       │                        - Pure TypeScript, framework-independent
│       │                        - 10/10 automated tests passing
│       │
│       └── devtools-ui/      ← Standalone React + Vite Engineering DevTools
│                                - Consumes devtools engine directly
│                                - Visual validation for detection, geometry, & BIONIC JSON
```

### Key Principles
- **Main is completely isolated**: `packages/typescript/main` does NOT import anything from `devtools` or `devtools-ui`.
- **Engine is framework-free**: `packages/typescript/devtools` contains no React, DOM, or browser UI dependencies.
- **DevTools UI is standalone**: `devtools-ui` has its own `package.json`, Vite configuration, and build pipeline.

---

## 2. Local Development

During local development, each application runs on its own dedicated server:

| Application | Working Directory | Command | Development URL |
|---|---|---|---|
| **Main People Tracking** | `packages/typescript/main` | `yarn dev` | `http://localhost:3000/` |
| **Floorplan DevTools** | `packages/typescript/devtools/devtools-ui` | `npm run dev` | `http://localhost:5173/_devtools/` (or `http://localhost:5173/`) |

To start the DevTools development server:
```bash
cd packages/typescript/devtools/devtools-ui
npm install
npm run dev
```

---

## 3. Production & Internal LAN Deployment (IIS Gateway)

In the internal LAN environment, both applications are accessed under port `3000`:
- **Main App**: `http://192.168.1.166:3000/`
- **Floorplan DevTools**: `http://192.168.1.166:3000/_devtools/`

IIS acts as the gateway mapping the URL paths to independent physical directories. **The Main application's React router does NOT need to know that `_devtools` exists.**

### Step-by-Step IIS Configuration

1. **Build the DevTools Application**:
   ```bash
   cd packages/typescript/devtools/devtools-ui
   npm run build
   ```
   This generates the production bundle in:
   `packages/typescript/devtools/devtools-ui/dist`

2. **Add Virtual Application in IIS**:
   - Open **Internet Information Services (IIS) Manager**.
   - Navigate to **Sites** &rarr; select the site running on port `3000`.
   - Right-click the site and select **Add Application...** (or **Add Virtual Directory...**).
   - Configure the following:
     - **Alias**: `_devtools`
     - **Physical path**: `E:\mencoba\Web\Modernize\packages\typescript\devtools\devtools-ui\dist`
     - **Application Pool**: DefaultAppPool (or the same pool used by the site)
   - Click **OK**.

3. **SPA Refresh Support (`web.config`)**:
   Inside `devtools-ui/dist`, ensure a `web.config` exists with URL rewrite rules to prevent 404s when users refresh:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <configuration>
     <system.webServer>
       <rewrite>
         <rules>
           <rule name="DevTools SPA Fallback" stopProcessing="true">
             <match url=".*" />
             <conditions logicalGrouping="MatchAll">
               <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
               <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
             </conditions>
             <action type="Rewrite" url="/_devtools/index.html" />
           </rule>
         </rules>
       </rewrite>
       <staticContent>
         <remove fileExtension=".json" />
         <mimeMap fileExtension=".json" mimeType="application/json" />
         <remove fileExtension=".webp" />
         <mimeMap fileExtension=".webp" mimeType="image/webp" />
       </staticContent>
     </system.webServer>
   </configuration>
   ```

---

## 4. Deploying Main WITHOUT DevTools

To deploy the production application without DevTools in customer or external environments:
1. Deploy ONLY the built output of `packages/typescript/main`.
2. Do NOT create the `_devtools` application in IIS.
3. Result:
   - `http://<SERVER_IP>:3000/` operates normally with full People Tracking functionality.
   - Any request to `http://<SERVER_IP>:3000/_devtools/` cleanly returns HTTP 404.
   - The production bundle contains zero floorplan AI/CV dependencies or DevTools code.
