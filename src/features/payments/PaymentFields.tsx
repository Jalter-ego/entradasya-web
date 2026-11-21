import './payments.css';

/**
 * Datos del pago simulado. Es el `payment` que la web manda a orders (nunca directo a payments);
 * orders calcula el importe con el precio de la reserva.
 */
export interface DemoCardPayment {
  method: 'demo_card';
  last4: '1111' | '0000';
}

export interface PaymentFieldsProps {
  value: DemoCardPayment;
  onChange: (value: DemoCardPayment) => void;
  disabled?: boolean;
}

const DEMO_CARDS: { last4: DemoCardPayment['last4']; title: string; result: string; tone: 'ok' | 'danger' }[] = [
  { last4: '1111', title: 'Tarjeta de demo terminada en 1111', result: 'El pago se aprueba', tone: 'ok' },
  { last4: '0000', title: 'Tarjeta de demo terminada en 0000', result: 'El pago se rechaza (para probar)', tone: 'danger' },
];

/**
 * Componente de pago de P4. Solo pide la terminación de una tarjeta ficticia:
 * 1111 aprueba y 0000 rechaza. No hay número de tarjeta, CVV ni dinero real.
 */
export function PaymentFields({ value, onChange, disabled }: PaymentFieldsProps) {
  const selected = DEMO_CARDS.find((card) => card.last4 === value.last4) ?? DEMO_CARDS[0];

  return (
    <fieldset className="fields payment-fields" disabled={disabled}>
      <legend className="field__label">Medio de pago</legend>

      <div className={`payment-card payment-card--${selected.tone}`} aria-hidden="true">
        <span className="payment-card__brand">EntradasYa · demo</span>
        <span className="payment-card__number">
          <span>••••</span> <span>••••</span> <span>••••</span> <strong>{selected.last4}</strong>
        </span>
        <span className="payment-card__result">{selected.result}</span>
      </div>

      <div className="payment-fields__options">
        {DEMO_CARDS.map((card) => (
          <label
            key={card.last4}
            className={`payment-option ${value.last4 === card.last4 ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="payment-last4"
              value={card.last4}
              checked={value.last4 === card.last4}
              onChange={() => onChange({ method: 'demo_card', last4: card.last4 })}
            />
            <span className="payment-option__text">
              <strong>•••• {card.last4}</strong>
              <span className="visually-hidden">{card.title}. </span>
              <span className={`payment-option__result payment-option__result--${card.tone}`}>{card.result}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="field__hint">Pago simulado: no se piden datos de tarjeta reales ni se cobra dinero.</p>
    </fieldset>
  );
}
