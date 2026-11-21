
do $seed$
declare cid uuid;
begin
insert into public.campaigns (slug, mode, is_featured, max_inventory, max_per_user, unit_price_cents, currency, timezone, demo_entries_sold, rules_status, title, tagline, description)
values (
  'gta-vi-legendary-drop', 'demo', true, 15000, 100, 99, 'USD', 'America/New_York', 10650, 'draft',
  jsonb_build_object('en','GTA VI Legendary Drop','es','GTA VI Legendary Drop','pt','GTA VI Legendary Drop'),
  jsonb_build_object('en','A PS5 Pro, GTA VI and more. Three winners. One legendary drop.','es','Una PS5 Pro, GTA VI y más. Tres ganadores. Un drop legendario.','pt','Um PS5 Pro, GTA VI e mais. Três vencedores. Um drop lendário.'),
  jsonb_build_object('en','The first Respawn Club featured campaign. 15,000 total entries, a maximum of 100 per account, and three prizes for three winners.','es','La primera campaña destacada de Respawn Club. 15.000 participaciones en total, un máximo de 100 por cuenta y tres premios para tres ganadores.','pt','A primeira campanha em destaque do Respawn Club. 15.000 participações no total, no máximo 100 por conta e três prêmios para três vencedores.')
) returning id into cid;

insert into public.prizes (campaign_id, rank, winner_count, title, description) values
(cid, 1, 1,
 jsonb_build_object('en','PlayStation 5 Pro + GTA VI','es','PlayStation 5 Pro + GTA VI','pt','PlayStation 5 Pro + GTA VI'),
 jsonb_build_object('en','A PlayStation 5 Pro console together with a copy of Grand Theft Auto VI.','es','Una consola PlayStation 5 Pro junto con una copia de Grand Theft Auto VI.','pt','Um console PlayStation 5 Pro junto com uma cópia de Grand Theft Auto VI.')),
(cid, 2, 1,
 jsonb_build_object('en','GTA VI — Physical or Digital','es','GTA VI — Física o Digital','pt','GTA VI — Física ou Digital'),
 jsonb_build_object('en','One copy of GTA VI. The winner selects the physical or digital format, subject to availability.','es','Una copia de GTA VI. El ganador elige el formato físico o digital, sujeto a disponibilidad.','pt','Uma cópia de GTA VI. O vencedor escolhe o formato físico ou digital, sujeito à disponibilidade.')),
(cid, 3, 1,
 jsonb_build_object('en','$50 Gift Card','es','Tarjeta de regalo de $50','pt','Gift card de US$ 50'),
 jsonb_build_object('en','A $50 gift card. The winner chooses PlayStation Store or Steam.','es','Una tarjeta de regalo de $50. El ganador elige PlayStation Store o Steam.','pt','Um gift card de US$ 50. O vencedor escolhe PlayStation Store ou Steam.'));

insert into public.campaign_packages (campaign_id, entries, price_cents, is_recommended, sort_order) values
(cid, 1, 99, false, 1), (cid, 5, 495, false, 2), (cid, 10, 990, true, 3),
(cid, 20, 1980, false, 4), (cid, 50, 4950, false, 5), (cid, 100, 9900, false, 6);

insert into public.faqs (campaign_id, sort_order, question, answer) values
(cid, 1, jsonb_build_object('en','What is Respawn Club?','es','¿Qué es Respawn Club?','pt','O que é o Respawn Club?'),
 jsonb_build_object('en','Respawn Club is a gaming promotions platform that runs prize campaigns for players. [Placeholder — organizer to confirm final description.]','es','Respawn Club es una plataforma de promociones gamer que organiza campañas de premios para jugadores. [Texto provisional — el organizador confirmará la descripción final.]','pt','O Respawn Club é uma plataforma de promoções gamer que realiza campanhas de prêmios para jogadores. [Texto provisório — o organizador confirmará a descrição final.]')),
(cid, 2, jsonb_build_object('en','What can I win?','es','¿Qué puedo ganar?','pt','O que posso ganhar?'),
 jsonb_build_object('en','1st prize: PlayStation 5 Pro + GTA VI. 2nd prize: one copy of GTA VI (physical or digital, subject to availability). 3rd prize: a $50 PlayStation Store or Steam gift card.','es','1er premio: PlayStation 5 Pro + GTA VI. 2do premio: una copia de GTA VI (física o digital, sujeto a disponibilidad). 3er premio: una tarjeta de regalo de $50 de PlayStation Store o Steam.','pt','1º prêmio: PlayStation 5 Pro + GTA VI. 2º prêmio: uma cópia de GTA VI (física ou digital, sujeito à disponibilidade). 3º prêmio: um gift card de US$ 50 da PlayStation Store ou Steam.')),
(cid, 3, jsonb_build_object('en','How many entries are available?','es','¿Cuántas participaciones hay disponibles?','pt','Quantas participações estão disponíveis?'),
 jsonb_build_object('en','The campaign has a maximum of 15,000 entries. The system never allows more than this limit.','es','La campaña tiene un máximo de 15.000 participaciones. El sistema nunca permite superar este límite.','pt','A campanha tem no máximo 15.000 participações. O sistema nunca permite ultrapassar esse limite.')),
(cid, 4, jsonb_build_object('en','What is the maximum number of entries per person?','es','¿Cuál es el máximo de participaciones por persona?','pt','Qual é o número máximo de participações por pessoa?'),
 jsonb_build_object('en','Each verified account can hold up to 100 valid entries.','es','Cada cuenta verificada puede tener hasta 100 participaciones válidas.','pt','Cada conta verificada pode ter até 100 participações válidas.')),
(cid, 5, jsonb_build_object('en','How does participation work?','es','¿Cómo funciona la participación?','pt','Como funciona a participação?'),
 jsonb_build_object('en','Participation is not open yet. The site is currently in demo mode: you can explore packages, but no entries are created and no payments are taken. [Placeholder — final process to be confirmed in the Official Rules.]','es','La participación aún no está abierta. El sitio está en modo demo: puedes explorar los paquetes, pero no se crean participaciones ni se cobran pagos. [Texto provisional — el proceso final se confirmará en las Bases Oficiales.]','pt','A participação ainda não está aberta. O site está em modo demo: você pode explorar os pacotes, mas nenhuma participação é criada e nenhum pagamento é cobrado. [Texto provisório — o processo final será confirmado no Regulamento Oficial.]')),
(cid, 6, jsonb_build_object('en','When does the campaign end?','es','¿Cuándo termina la campaña?','pt','Quando a campanha termina?'),
 jsonb_build_object('en','The closing date will be shown in the countdown on this page once it is confirmed by the organizer.','es','La fecha de cierre aparecerá en la cuenta regresiva de esta página cuando el organizador la confirme.','pt','A data de encerramento aparecerá na contagem regressiva desta página assim que o organizador confirmar.')),
(cid, 7, jsonb_build_object('en','How are winners selected?','es','¿Cómo se eligen los ganadores?','pt','Como os vencedores são escolhidos?'),
 jsonb_build_object('en','[Placeholder — the winner selection method will be described in the Official Rules once approved.]','es','[Texto provisional — el método de selección se describirá en las Bases Oficiales una vez aprobadas.]','pt','[Texto provisório — o método de seleção será descrito no Regulamento Oficial após aprovação.]')),
(cid, 8, jsonb_build_object('en','When and where will winners be announced?','es','¿Cuándo y dónde se anunciarán los ganadores?','pt','Quando e onde os vencedores serão anunciados?'),
 jsonb_build_object('en','[Placeholder — announcement date and channels to be confirmed by the organizer.]','es','[Texto provisional — la fecha y los canales del anuncio serán confirmados por el organizador.]','pt','[Texto provisório — a data e os canais do anúncio serão confirmados pelo organizador.]')),
(cid, 9, jsonb_build_object('en','How will prizes be delivered?','es','¿Cómo se entregarán los premios?','pt','Como os prêmios serão entregues?'),
 jsonb_build_object('en','[Placeholder — delivery and fulfillment details will be set out in the Official Rules.]','es','[Texto provisional — los detalles de entrega se indicarán en las Bases Oficiales.]','pt','[Texto provisório — os detalhes de entrega serão definidos no Regulamento Oficial.]')),
(cid, 10, jsonb_build_object('en','Can I choose a physical or digital GTA VI copy?','es','¿Puedo elegir una copia física o digital de GTA VI?','pt','Posso escolher uma cópia física ou digital de GTA VI?'),
 jsonb_build_object('en','Yes — the second-prize winner can select the available format, subject to availability.','es','Sí — el ganador del segundo premio puede elegir el formato disponible, sujeto a disponibilidad.','pt','Sim — o vencedor do segundo prêmio pode escolher o formato disponível, sujeito à disponibilidade.')),
(cid, 11, jsonb_build_object('en','Can I choose between PlayStation Store and Steam for the third prize?','es','¿Puedo elegir entre PlayStation Store y Steam para el tercer premio?','pt','Posso escolher entre PlayStation Store e Steam no terceiro prêmio?'),
 jsonb_build_object('en','Yes — the third-prize winner chooses a $50 PlayStation Store or Steam gift card.','es','Sí — el ganador del tercer premio elige una tarjeta de $50 de PlayStation Store o Steam.','pt','Sim — o vencedor do terceiro prêmio escolhe um gift card de US$ 50 da PlayStation Store ou Steam.')),
(cid, 12, jsonb_build_object('en','What happens if the campaign does not reach its maximum inventory?','es','¿Qué pasa si la campaña no alcanza su inventario máximo?','pt','O que acontece se a campanha não atingir o limite máximo?'),
 jsonb_build_object('en','[Placeholder — to be defined by the organizer in the Official Rules.]','es','[Texto provisional — lo definirá el organizador en las Bases Oficiales.]','pt','[Texto provisório — será definido pelo organizador no Regulamento Oficial.]')),
(cid, 13, jsonb_build_object('en','How can I contact support?','es','¿Cómo contacto con soporte?','pt','Como entro em contato com o suporte?'),
 jsonb_build_object('en','[Placeholder — support email and channels to be added by the organizer.]','es','[Texto provisional — el organizador añadirá el correo y canales de soporte.]','pt','[Texto provisório — o organizador adicionará o e-mail e os canais de suporte.]')),
(cid, 14, jsonb_build_object('en','Is there an alternative free entry method?','es','¿Existe un método de participación gratuito alternativo?','pt','Existe um método alternativo de participação gratuita?'),
 jsonb_build_object('en','[Placeholder — if applicable, the free alternative method of entry will be described in the Official Rules.]','es','[Texto provisional — si corresponde, el método gratuito alternativo se describirá en las Bases Oficiales.]','pt','[Texto provisório — se aplicável, o método gratuito alternativo será descrito no Regulamento Oficial.]'));

insert into public.rules_sections (campaign_id, section_number, title, body)
select cid, s.n,
  jsonb_build_object('en', s.en, 'es', s.es, 'pt', s.pt),
  jsonb_build_object(
    'en', 'DRAFT — SUBJECT TO LEGAL REVIEW. [To be completed by the organizer and reviewed by legal counsel before publication.]',
    'es', 'BORRADOR — SUJETO A REVISIÓN LEGAL. [A completar por el organizador y revisar por asesoría legal antes de su publicación.]',
    'pt', 'RASCUNHO — SUJEITO A REVISÃO JURÍDICA. [A ser preenchido pelo organizador e revisado por assessoria jurídica antes da publicação.]')
from (values
  (1,'Organizer information','Información del organizador','Informações do organizador'),
  (2,'Campaign description','Descripción de la campaña','Descrição da campanha'),
  (3,'Prize descriptions and approximate retail values','Descripción de premios y valores aproximados','Descrição dos prêmios e valores aproximados'),
  (4,'Opening and closing dates','Fechas de apertura y cierre','Datas de abertura e encerramento'),
  (5,'Eligibility requirements','Requisitos de elegibilidad','Requisitos de elegibilidade'),
  (6,'Geographic restrictions','Restricciones geográficas','Restrições geográficas'),
  (7,'Entry limits','Límites de participación','Limites de participação'),
  (8,'Entry methods, including any free alternative method','Métodos de participación, incluido cualquier método gratuito alternativo','Métodos de participação, incluindo qualquer método gratuito alternativo'),
  (9,'Winner selection process','Proceso de selección de ganadores','Processo de seleção dos vencedores'),
  (10,'Winner notification and announcement','Notificación y anuncio de ganadores','Notificação e anúncio dos vencedores'),
  (11,'Prize delivery and fulfillment','Entrega de premios','Entrega dos prêmios'),
  (12,'Taxes and additional costs','Impuestos y costos adicionales','Impostos e custos adicionais'),
  (13,'Refund and cancellation policy','Política de reembolso y cancelación','Política de reembolso e cancelamento'),
  (14,'Disqualification and fraud prevention','Descalificación y prevención de fraude','Desclassificação e prevenção de fraude'),
  (15,'Privacy and personal data','Privacidad y datos personales','Privacidade e dados pessoais'),
  (16,'Limitation of liability','Limitación de responsabilidad','Limitação de responsabilidade'),
  (17,'Contact information','Información de contacto','Informações de contato'),
  (18,'Applicable governing terms and jurisdiction','Términos aplicables y jurisdicción','Termos aplicáveis e jurisdição')
) as s(n, en, es, pt);
end
$seed$;
