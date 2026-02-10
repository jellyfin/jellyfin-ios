/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import af from './langs/af.json';
import ar from './langs/ar.json';
import be from './langs/be.json';
import bg from './langs/bg.json';
import ca from './langs/ca.json';
import cs from './langs/cs.json';
import cy from './langs/cy.json';
import da from './langs/da.json';
import de from './langs/de.json';
import el from './langs/el.json';
import en from './langs/en.json';
import eo from './langs/eo.json';
import es from './langs/es.json';
import es_419 from './langs/es_419.json';
import es_AR from './langs/es_AR.json';
import et from './langs/et.json';
import eu from './langs/eu.json';
import fa from './langs/fa.json';
import fi from './langs/fi.json';
import fil from './langs/fil.json';
import fr from './langs/fr.json';
import ga from './langs/ga.json';
import he from './langs/he.json';
import hr from './langs/hr.json';
import hu from './langs/hu.json';
import hy from './langs/hy.json';
import id from './langs/id.json';
import is from './langs/is.json';
import it from './langs/it.json';
import ja from './langs/ja.json';
import kk from './langs/kk.json';
import ko from './langs/ko.json';
import lt from './langs/lt.json';
import lv from './langs/lv.json';
import mn from './langs/mn.json';
import ms from './langs/ms.json';
import mt from './langs/mt.json';
import nb_NO from './langs/nb_NO.json';
import nds from './langs/nds.json';
import nl from './langs/nl.json';
import pl from './langs/pl.json';
import pt from './langs/pt.json';
import pt_BR from './langs/pt_BR.json';
import pt_PT from './langs/pt_PT.json';
import ro from './langs/ro.json';
import ru from './langs/ru.json';
import sk from './langs/sk.json';
import sl from './langs/sl.json';
import sq from './langs/sq.json';
import sr from './langs/sr.json';
import sv from './langs/sv.json';
import ta from './langs/ta.json';
import tr from './langs/tr.json';
import uk from './langs/uk.json';
import vi from './langs/vi.json';
import zh_Hans from './langs/zh_Hans.json';
import zh_Hant from './langs/zh_Hant.json';

export const resources = {
	en: { translation: en },
	af: { translation: af },
	ar: { translation: ar },
	be: { translation: be },
	bg: { translation: bg },
	ca: { translation: ca },
	cs: { translation: cs },
	cy: { translation: cy },
	da: { translation: da },
	de: { translation: de },
	el: { translation: el },
	eo: { translation: eo },
	es: { translation: es },
	'es-419': { translation: es_419 },
	'es-AR': { translation: es_AR },
	et: { translation: et },
	eu: { translation: eu },
	fa: { translation: fa },
	fi: { translation: fi },
	fil: { translation: fil },
	fr: { translation: fr },
	ga: { translation: ga },
	he: { translation: he },
	hr: { translation: hr },
	hu: { translation: hu },
	hy: { translation: hy },
	id: { translation: id },
	is: { translation: is },
	it: { translation: it },
	ja: { translation: ja },
	kk: { translation: kk },
	ko: { translation: ko },
	lt: { translation: lt },
	lv: { translation: lv },
	mn: { translation: mn },
	ms: { translation: ms },
	mt: { translation: mt },
	'nb-NO': { translation: nb_NO },
	nds: { translation: nds },
	nl: { translation: nl },
	pl: { translation: pl },
	pt: { translation: pt },
	'pt-BR': { translation: pt_BR },
	'pt-PT': { translation: pt_PT },
	ro: { translation: ro },
	ru: { translation: ru },
	sk: { translation: sk },
	sl: { translation: sl },
	sq: { translation: sq },
	sr: { translation: sr },
	sv: { translation: sv },
	ta: { translation: ta },
	tr: { translation: tr },
	uk: { translation: uk },
	vi: { translation: vi },
	'zh-Hans': { translation: zh_Hans },
	'zh-Hant': { translation: zh_Hant }
};

// Ensure RTL layout is enabled for RTL locales
const deviceLocale = getLocales()[0];
I18nManager.forceRTL(deviceLocale?.textDirection === 'rtl');

i18next
	.use(initReactI18next)
	.init({
		// debug: true,
		compatibilityJSON: 'v3',
		fallbackLng: 'en',
		// Use the fallback language for empty strings
		returnEmptyString: false,
		lng: deviceLocale?.languageTag,
		interpolation: {
			escapeValue: false
		},
		resources
	});

// Export i18next instance for use in tests
export default i18next;
