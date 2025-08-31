import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(222);
	return <div onClickCapture={() => setNum((pre) => pre + 1)}>{num}</div>;
}
function Child() {
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
