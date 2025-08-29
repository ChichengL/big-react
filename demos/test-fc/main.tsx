import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(0);
	return <div>{num}</div>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
