import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(222);
	window.setNum = setNum;
	return num === 3 ? <Child /> : <div>{num}</div>;
}
function Child() {
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
