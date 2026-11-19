# AutoTrack

An automotive asset management and machine shop maintenance tracking platform built with React, TypeScript, C# (.NET), and MySQL.

---

## Prerequisites

Before running the project locally, ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [.NET SDK](https://dotnet.microsoft.com/download)
* Access to a **live MySQL server** initialized with the schema (`autotrack_tables.sql`) and `sample_data.sql` SQL scripts located in the `MySQL` folder

---

## Getting Started

### 1. Clone the Repository

```bash
git clone [https://github.com/HilbersLiam/AutoTrack.git](https://github.com/HilbersLiam/AutoTrack.git)
cd AutoTrack
```

### 2. Configure & Run the Backend

1. Navigate to the backend project directory:
   ```bash
   cd Backend/AutoTrack
   ```
2. Create a `.env` file inside `Backend/AutoTrack` and add your database connection string:
   ```env
   ConnectionStrings__Default=Server=YOUR_SERVER;Port=YOUR_PORT;User Id=YOUR_USER;Password=YOUR_PASSWORD;Database=YOUR_DATABASE;
   ```
3. Start the backend APIs:
   ```bash
   dotnet run
   ```

### 3. Run the Frontend

Open a **separate terminal** window/tab from the root `AutoTrack` directory:

1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the `localhost` URL printed in the terminal (e.g., `http://localhost:5173`).

---

## Troubleshooting

### CORS Errors
If the frontend cannot communicate with the backend APIs due to a CORS policy block:
1. Check the exact `localhost` URL and port generated when you ran `npm run dev` (e.g., `http://localhost:5173`).
2. Open `Backend/AutoTrack/Program.cs`.
3. Ensure the allowed origin URL in the CORS configuration matches your frontend's `localhost` address.