# Inspector

![Zizmor Checks](https://github.com/vechain/inspector-app/actions/workflows/scan-workflows.yaml/badge.svg?branch=main&event=push)

Static web site for contract call with ABI and contract address.

[Try it out!](https://inspector.vecha.in/#/)

## Project setup

### Install dependencies

```
yarn
```

### Compiles with hot-reload for development

```
yarn serve
```

### Compiles and minifies for production

```
yarn build
```

## Build and run with Docker

```
docker build -t inspector-app .
```

```
docker run -dp 127.0.0.1:8080:80 inspector-app
```

or with docker compose

```
docker compose up -d --build
```

### In your local machine

Create a `.env` file with the url of the solo node you want to connect

```
VUE_APP_SOLO_URL=http://localhost:8080
```

### With docker

We can provide runtime env variables using -e

#### Using image from registry

```
docker run ghcr.io/vechain/insight-app:master -e VUE_APP_SOLO_URL=http://localhost:8080
```

#### Build local image

```
docker build -t inspector-app
docker run -e VUE_APP_SOLO_URL=http://localhost:8080
```

### With compose

Use the image and pass the env variable in the compose file directly

```
version: "3.7"
services:
  insight:
    image: ghcr.io/vechain/inspector-app:master
    hostname: inspector
    container_name: inspector
    environment:
      - VUE_APP_SOLO_URL=http://localhost:8669
    ports:
      - "8080:80"
```

## Contributing

Everyone is always welcome to contribute on the codebase.

## Ralph - Autonomous Agent Runner

Ralph is a script that runs Claude autonomously to implement features from a PRD (Product Requirements Document).

### Workflow

1. **Describe the feature** you want to implement
2. **Run `/prd`** - Creates detailed PRD markdown in `tasks/prd-[feature-name].md`
   - Asks clarifying questions first
   - Generates user stories with acceptance criteria
3. **Run `/ralph`** - Converts PRD to `prd.json` format
   - Archives previous prd.json/progress.txt if different feature
   - Resets `progress.txt` to empty
   - Creates `prd.json` with stories ready for execution
4. **Run Ralph** in a new terminal tab:
   ```bash
   ./ralph.sh 10
   ```
5. **Wait for completion** - Ralph implements each story and commits

### PRD Format

```json
{
  "project": "Feature Name",
  "stories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "Detailed description of what needs to be done",
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

- **priority**: Lower number = higher priority (1 is first)
- **passes**: Set to `false` initially, Ralph sets to `true` when done
- **notes**: Ralph fills this with implementation details

### How Ralph Works

Each iteration:

1. Find highest-priority story with `passes: false`
2. Implement the feature
3. Run type checks (`yarn typecheck`)
4. Update `prd.json`: set `passes: true` and add notes
5. Append progress to `progress.txt`
6. Create a git commit

Stops when all stories have `passes: true` or iterations exhausted.
