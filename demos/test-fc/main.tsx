import ReactDOM from 'react-dom/client';
import { useState } from 'react';
function App() {
	const [num, setNum] = useState(222);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
	return (
		<div onClickCapture={() => setNum((pre) => pre + 1)}>
			{num}
			<ul>{arr}</ul>
		</div>
	);
}
function Child() {
	return <p>child</p>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
